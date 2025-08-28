require "active_record"
require "sqlite3"
require "date"

# Database setup - use Docker volume for persistence
db_dir = ENV["RACK_ENV"] == "production" ? "/app/data" : File.dirname(__FILE__)
db_path = File.join(db_dir, "..", "hotel_pms.db")

ActiveRecord::Base.establish_connection(
  adapter: "sqlite3",
  database: db_path
)

# Create tables
ActiveRecord::Base.connection.execute("PRAGMA foreign_keys = OFF")

ActiveRecord::Schema.define do
  # Drop tables in reverse order to avoid foreign key issues
  drop_table :reservations if ActiveRecord::Base.connection.table_exists?(:reservations)
  drop_table :guests if ActiveRecord::Base.connection.table_exists?(:guests)
  drop_table :rooms if ActiveRecord::Base.connection.table_exists?(:rooms)
  
  create_table :rooms do |t|
    t.string :room_number
    t.string :room_type
    t.integer :floor
    t.decimal :rate, precision: 10, scale: 2
    t.string :status, default: "vacant"
    t.timestamps
  end
  
  create_table :guests do |t|
    t.string :full_name
    t.string :email
    t.string :phone
    t.string :id_number
    t.timestamps
  end
  
  create_table :reservations do |t|
    t.string :confirmation_number
    t.references :room, foreign_key: true
    t.references :guest, foreign_key: true
    t.date :check_in
    t.date :check_out
    t.decimal :total_amount, precision: 10, scale: 2
    t.string :status, default: "confirmed"
    t.timestamps
  end
end

ActiveRecord::Base.connection.execute("PRAGMA foreign_keys = ON")

# Load models
require_relative "../app"

# Seed rooms - make most of them vacant initially
room_types = ["Standard", "Deluxe", "Suite", "Presidential"]
(1..4).each do |floor|
  (1..10).each do |room_num|
    room_number = "#{floor}0#{room_num.to_s.rjust(2, "0")}"
    room_type = room_types.sample
    rate = case room_type
           when "Standard" then rand(100..150)
           when "Deluxe" then rand(150..250)
           when "Suite" then rand(250..400)
           when "Presidential" then rand(400..800)
           end
    
    Room.create!(
      room_number: room_number,
      room_type: room_type,
      floor: floor,
      rate: rate,
      status: "vacant"  # All rooms start vacant
    )
  end
end

# Seed guests
50.times do |i|
  Guest.create!(
    full_name: ["John Smith", "Jane Doe", "Bob Johnson", "Alice Williams", "Charlie Brown"].sample + " #{i}",
    email: "guest#{i}@email.com",
    phone: "555-#{rand(1000..9999)}",
    id_number: "ID#{rand(100000..999999)}"
  )
end

# Seed reservations - with error handling
30.times do
  room = Room.where(status: "vacant").sample
  
  # Skip if no vacant rooms available
  next if room.nil?
  
  guest = Guest.all.sample
  check_in = Date.today + rand(-5..10)
  nights = rand(1..7)
  check_out = check_in + nights
  
  reservation = Reservation.create!(
    room: room,
    guest: guest,
    check_in: check_in,
    check_out: check_out,
    total_amount: room.rate * nights,
    confirmation_number: "HTL#{Time.now.to_i}#{rand(1000)}",
    status: check_in <= Date.today ? "checked_in" : "confirmed"
  )
  
  if reservation.status == "checked_in"
    room.update(status: "occupied")
  end
end

puts "Database seeded successfully!"
puts "Rooms: #{Room.count}"
puts "Guests: #{Guest.count}"
puts "Reservations: #{Reservation.count}"
