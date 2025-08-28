require 'sinatra/base'
require 'sinatra/cors'
require 'sinatra/json'
require 'active_record'
require 'sqlite3'
require 'json'
require 'logger'
require 'net/http'
require 'uri'

# Set up logging to file
log_dir = ENV['RACK_ENV'] == 'production' ? '/app/logs' : File.join(File.dirname(__FILE__), 'logs')
FileUtils.mkdir_p(log_dir) unless File.directory?(log_dir)

# Configure logger to write to file
$logger = Logger.new(File.join(log_dir, 'application.log'), 'daily')
$logger.level = Logger::INFO
$logger.formatter = proc do |severity, datetime, progname, msg|
  # JSON format logging
  {
    timestamp: datetime.iso8601,
    level: severity,
    service: 'hotel-pms-backend',
    message: msg,
    environment: ENV['RACK_ENV'] || 'development'
  }.to_json + "\n"
end

# Also keep console output for Docker logs
$stdout.sync = true
console_logger = Logger.new($stdout)

# Database setup - use Docker volume for persistence
db_dir = ENV['RACK_ENV'] == 'production' ? '/app/data' : File.dirname(__FILE__)
db_path = File.join(db_dir, 'hotel_pms.db')

ActiveRecord::Base.establish_connection(
  adapter: 'sqlite3',
  database: db_path
)

# Models
class Room < ActiveRecord::Base
  has_many :reservations
  
  def available_for_dates?(check_in, check_out)
    reservations.where(
      '(check_in <= ? AND check_out >= ?) OR (check_in <= ? AND check_out >= ?)',
      check_in, check_in, check_out, check_out
    ).empty?
  end
end

class Guest < ActiveRecord::Base
  has_many :reservations
end

class Reservation < ActiveRecord::Base
  belongs_to :room
  belongs_to :guest
  
  scope :current, -> { where(status: ['confirmed', 'checked_in']) }
  scope :today_arrivals, -> { where(check_in: Date.today, status: 'confirmed') }
  scope :today_departures, -> { where(check_out: Date.today, status: 'checked_in') }
end

# API Application
class HotelPMSAPI < Sinatra::Base
  set :bind, '0.0.0.0'
  register Sinatra::Cors
  
  set :allow_origin, "*"
  set :allow_methods, "GET,HEAD,POST,PUT,DELETE,OPTIONS"
  set :allow_headers, "content-type,if-modified-since"
  set :expose_headers, "location,link"
  
  # Add request logging
  before do
      # Store start time for duration calculation
      @start_time = Time.now  # ← KEEP THIS!
      
      # Extract user context from headers
      session_id = request.env['HTTP_X_SESSION_ID']
      user_id = request.env['HTTP_X_USER_ID']
      user_email = request.env['HTTP_X_USER_EMAIL']
      
      # Add to current span if available (for OpenTelemetry)
      if defined?(current_span) && current_span && current_span.context.valid?
          current_span.set_attribute('user.session_id', session_id) if session_id
          current_span.set_attribute('user.id', user_id) if user_id
          current_span.set_attribute('user.email', user_email) if user_email
      end
      
      # Include user info in logs
      $logger.info({
          method: request.request_method,
          path: request.path_info,
          params: params.to_json,
          ip: request.ip,
          session_id: session_id,      # ← NEW
          user_id: user_id,            # ← NEW
          user_email: user_email       # ← NEW
      })
      
      content_type :json
  end
  
  # Add response logging
  after do
    duration = Time.now - @start_time if @start_time
    
    # Log all responses (or adjust condition as needed)
    $logger.info({
      method: request.request_method,
      path: request.path_info,
      status: response.status,
      duration: duration ? (duration * 1000).round(2) : nil  # Convert to milliseconds
    })
    
    # Optionally log errors with more detail
    if response.status >= 400
      $logger.error({
        method: request.request_method,
        path: request.path_info,
        status: response.status,
        duration: duration ? (duration * 1000).round(2) : nil
      })
    end
  end
  
  # Add error logging
  error do
    e = env['sinatra.error']
    $logger.error({
      error: e.class.name,
      message: e.message,
      backtrace: e.backtrace.first(5)
    })  # No .to_json here
    
    status 500
    json({ error: 'Internal server error' })
  end
  
  # Simulate API latency for some endpoints (to test RUM)
  def simulate_latency
    sleep(rand(0.1..0.5)) if rand > 0.7
  end
  
  # Dashboard metrics
  get '/api/dashboard/stats' do
    simulate_latency
    
    stats = {}
    
    stats[:total_rooms] = Room.count
    
    # Count rooms by their actual status from the rooms table
    stats[:occupied_rooms] = Room.where(status: 'occupied').count
    stats[:available_rooms] = Room.where(status: 'vacant').count
    stats[:maintenance_rooms] = Room.where(status: 'maintenance').count
    
    # Alternative calculation based on active reservations
    stats[:reserved_rooms] = Reservation.current.count
    stats[:checked_in_rooms] = Reservation.current.where(status: 'checked_in').count
    stats[:confirmed_rooms] = Reservation.current.where(status: 'confirmed').count
    
    # Calculate truly available rooms (vacant and not reserved)
    reserved_room_ids = Reservation.current.pluck(:room_id)
    stats[:truly_available_rooms] = Room.where(status: 'vacant').where.not(id: reserved_room_ids).count
    
    # Occupancy rate based on checked-in rooms
    stats[:occupancy_rate] = (stats[:checked_in_rooms].to_f / Room.count * 100).round(2)
    
    stats[:today_arrivals] = Reservation.today_arrivals.count
    stats[:today_departures] = Reservation.today_departures.count
    
    stats[:revenue_today] = Reservation.where(check_in: Date.today).sum(:total_amount)
    
    json stats
  end
  
  # Rooms endpoints
  get '/api/rooms' do
    rooms = Room.all.map do |room|
      reservation = room.reservations.current.first
      {
        id: room.id,
        room_number: room.room_number,
        room_type: room.room_type,
        floor: room.floor,
        rate: room.rate,
        status: room.status,
        current_guest: reservation ? reservation.guest.full_name : nil
      }
    end
    
    json rooms
  end
  
  get '/api/rooms/available' do
    check_in = params[:check_in]
    check_out = params[:check_out]
    
    available_rooms = Room.all.select do |room|
      room.available_for_dates?(check_in, check_out)
    end
    
    json available_rooms
  end
  
  put '/api/rooms/:id/status' do
    room = Room.find(params[:id])
    room.update(status: params[:status])
    json room
  end
  
  # Reservations endpoints
  get '/api/reservations' do
    simulate_latency
    
    reservations = Reservation.includes(:room, :guest).map do |res|
      {
        id: res.id,
        confirmation_number: res.confirmation_number,
        guest_name: res.guest.full_name,
        guest_email: res.guest.email,
        room_number: res.room.room_number,
        check_in: res.check_in,
        check_out: res.check_out,
        status: res.status,
        total_amount: res.total_amount,
        nights: (res.check_out - res.check_in).to_i
      }
    end
    
    json reservations
  end
  
  post '/api/reservations' do
    data = JSON.parse(request.body.read)
    
    # Simulate occasional errors
    if rand > 0.95
      status 500
      return json({ error: 'Database connection timeout' })
    end
    
    # Find or create guest
    guest = Guest.find_or_create_by(email: data['guest_email']) do |g|
      g.full_name = data['guest_name']
      g.phone = data['guest_phone']
    end
    
    # Create reservation
    confirmation_number = "HTL#{Time.now.to_i}#{rand(1000)}"
    
    reservation = Reservation.create!(
      room_id: data['room_id'],
      guest_id: guest.id,
      check_in: data['check_in'],
      check_out: data['check_out'],
      total_amount: data['total_amount'],
      status: 'confirmed',
      confirmation_number: confirmation_number
    )
    
    json reservation
  end
  
  # Check-in/Check-out
  post '/api/checkin/:id' do
    begin
      reservation = Reservation.find(params[:id])
      
      reservation.update(status: 'checked_in')
      reservation.room.update(status: 'occupied')
      
      json({ success: true, message: 'Guest checked in successfully' })
    rescue ActiveRecord::RecordNotFound => e
      status 404
      json({ error: 'Reservation not found' })
    end
  end
  
  post '/api/checkout/:id' do
    simulate_latency
    
    begin
      reservation = Reservation.find(params[:id])
      
      reservation.update(status: 'checked_out')
      reservation.room.update(status: 'vacant')
      
      # Simulate payment processing
      sleep(rand(0.5..1.5))
      
      json({ 
        success: true, 
        message: 'Guest checked out successfully',
        final_amount: reservation.total_amount
      })
    rescue ActiveRecord::RecordNotFound => e
      status 404
      json({ error: 'Reservation not found' })
    end
  end
  
  # Guest search
  get '/api/guests/search' do
    query = params[:q]
    guests = Guest.where('full_name LIKE ? OR email LIKE ?', "%#{query}%", "%#{query}%")
    json guests
  end
  
  # Login search - search for reservations and guests for quick login
  get '/api/login/search' do
    query = params[:q]
    return json([]) if query.nil? || query.empty?
    
    results = []
    
    # Search by confirmation number (starts with HTL)
    if query.match?(/^HTL/i)
      reservation = Reservation.includes(:guest).find_by(confirmation_number: query.upcase)
      if reservation && reservation.guest
        results << {
          type: 'reservation',
          reservation_number: reservation.confirmation_number,
          guest_name: reservation.guest.full_name,
          email: reservation.guest.email,
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          status: reservation.status
        }
      end
    end
    
    # Search guests by name or email
    Guest.where('full_name LIKE ? OR email LIKE ?', "%#{query}%", "%#{query}%")
         .limit(10)
         .each do |guest|
      # Get most recent reservation for this guest
      recent_reservation = guest.reservations.order(created_at: :desc).first
      
      results << {
        type: 'guest',
        guest_name: guest.full_name,
        email: guest.email,
        phone: guest.phone,
        reservation_number: recent_reservation&.confirmation_number,
        last_stay: recent_reservation&.check_in,
        status: recent_reservation&.status
      }
    end
    
    json results
  end
  
  # Error simulation endpoint (for testing error tracking)
  get '/api/simulate/error' do
    case rand(3)
    when 0
      status 404
      json({ error: 'Resource not found' })
    when 1
      status 500
      json({ error: 'Internal server error' })
    else
      raise StandardError, 'Simulated application error'
    end
  end
  
  
  run! if app_file == $0
end