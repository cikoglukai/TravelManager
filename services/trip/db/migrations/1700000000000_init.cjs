/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('users', {
    firebase_uid: { type: 'text', primaryKey: true },
    email:        { type: 'text', notNull: true, unique: true },
    name:         { type: 'text', notNull: true },
    bio:          { type: 'text', notNull: true, default: '' },
    home_city:    { type: 'text', notNull: true, default: '' },
    avatar_url:   { type: 'text', notNull: true, default: '' },
    created_at:   { type: 'timestamptz', default: pgm.func('now()') },
  })

  pgm.createTable('trips', {
    id:                 'id',
    user_uid:           { type: 'text', notNull: true, references: 'users(firebase_uid)', onDelete: 'CASCADE' },
    title:              { type: 'text', notNull: true },
    destination:        { type: 'text', notNull: true },
    origin:             { type: 'text', notNull: true, default: '' },
    start_date:         { type: 'date', notNull: true },
    end_date:           { type: 'date' },
    short_description:  { type: 'text', notNull: true },
    detail_description: { type: 'text', notNull: true, default: '' },
    created_at:         { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.createIndex('trips', 'user_uid')
  pgm.createIndex('trips', 'start_date')

  pgm.createTable('plan_locations', {
    id:          'id',
    trip_id:     { type: 'integer', notNull: true, references: 'trips', onDelete: 'CASCADE' },
    name:        { type: 'text', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    image_url:   { type: 'text', notNull: true, default: '' },
    date_from:   { type: 'date' },
    date_to:     { type: 'date' },
    position:    { type: 'integer', notNull: true, default: 0 },
    created_at:  { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.createIndex('plan_locations', 'trip_id')

  pgm.createTable('travel_plans', {
    id:                                    'id',
    trip_id:                               { type: 'integer', notNull: true, unique: true, references: 'trips', onDelete: 'CASCADE' },
    mode:                                  { type: 'text', notNull: true, default: 'template' },
    destination_id:                        { type: 'integer' },
    route_id:                              { type: 'integer' },
    transport_option_id:                   { type: 'integer' },
    accommodation_option_id:               { type: 'integer' },
    notes:                                 { type: 'text', notNull: true, default: '' },
    custom_destination:                    { type: 'text' },
    custom_route_name:                     { type: 'text' },
    custom_route_description:              { type: 'text' },
    custom_duration_days:                  { type: 'integer' },
    custom_highlights:                     { type: 'text' },
    custom_transport_type:                 { type: 'text' },
    custom_transport_provider:             { type: 'text' },
    custom_transport_duration:             { type: 'text' },
    custom_transport_price_from:           { type: 'integer' },
    custom_transport_notes:                { type: 'text' },
    custom_accommodation_type:             { type: 'text' },
    custom_accommodation_name:             { type: 'text' },
    custom_accommodation_price_per_night:  { type: 'integer' },
    custom_accommodation_rating:           { type: 'numeric', precision: 2, scale: 1 },
    custom_accommodation_notes:            { type: 'text' },
    created_at:                            { type: 'timestamptz', default: pgm.func('now()') },
    updated_at:                            { type: 'timestamptz', default: pgm.func('now()') },
  })
}

exports.down = (pgm) => {
  pgm.dropTable('travel_plans')
  pgm.dropTable('plan_locations')
  pgm.dropTable('trips')
  pgm.dropTable('users')
}
