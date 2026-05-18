/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('tenants', {
    id:         { type: 'text', primaryKey: true },           // subdomain slug
    name:       { type: 'text', notNull: true },
    plan:       { type: 'text', notNull: true, default: 'free' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.addConstraint('tenants', 'plan_check',
    `CHECK (plan IN ('free','standard','enterprise'))`)

  pgm.createTable('white_label', {
    tenant_id:       { type: 'text', primaryKey: true, references: 'tenants', onDelete: 'CASCADE' },
    logo_url:        { type: 'text', notNull: true, default: '' },
    primary_color:   { type: 'text', notNull: true, default: '' },
    accent_color:    { type: 'text', notNull: true, default: '' },
    custom_domain:   { type: 'text', notNull: true, default: '' },
    email_from_name: { type: 'text', notNull: true, default: '' },
    updated_at:      { type: 'timestamptz', default: pgm.func('now()') },
  })

  pgm.createTable('sso_config', {
    tenant_id:    { type: 'text', primaryKey: true, references: 'tenants', onDelete: 'CASCADE' },
    provider:     { type: 'text', notNull: true },                 // saml | oidc
    metadata_url: { type: 'text', notNull: true, default: '' },
    config_json:  { type: 'jsonb', notNull: true, default: '{}' },
    updated_at:   { type: 'timestamptz', default: pgm.func('now()') },
  })

  pgm.createTable('users', {
    firebase_uid: { type: 'text', notNull: true },
    tenant_id:    { type: 'text', notNull: true, references: 'tenants' },
    email:        { type: 'text', notNull: true },
    name:         { type: 'text', notNull: true },
    bio:          { type: 'text', notNull: true, default: '' },
    home_city:    { type: 'text', notNull: true, default: '' },
    avatar_url:   { type: 'text', notNull: true, default: '' },
    role:         { type: 'text', notNull: true, default: 'member' },  // member | admin | destination_manager
    created_at:   { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.addConstraint('users', 'users_pk', { primaryKey: ['firebase_uid', 'tenant_id'] })
  pgm.createIndex('users', ['tenant_id', 'email'], { unique: true })
}

exports.down = (pgm) => {
  pgm.dropTable('users')
  pgm.dropTable('sso_config')
  pgm.dropTable('white_label')
  pgm.dropTable('tenants')
}
