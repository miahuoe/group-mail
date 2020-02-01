# shared mail
or groupmail

## It's a uni project
- Each group has it's own mailbox
- Each group has it's administrator that can do slightly more
- Each member can post in group and comment posts
- Backend only
- Documented using swagger

## Tech info
- Node.js + Express
- Objection.js (+ knex) for ORM
- Tested using supertest and mocha
- node-imap for communication with DB
- Uses JWT for logging in
- Passwords are hashed using bcrypt
- Dovecot for IMAP server (doesn't include any MTA like postfix)
- Uses MySQL database (a few things need to be changed to work on other databases)
- Everyting put together using docker-compose
- Somewhat chaotic docker scripts - need to be rewritten.
- Mail domain is hardcoded (no MTA, so there was no need to do it)
