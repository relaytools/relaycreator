# relaytools: relaycreator

Relay creator is a NextJS application that is part of the [relaytools](https://github.com/relaytools) stack.
It provides a UI and API for creating #nostr relays.

## Getting Started

### Pre-requirements

You'll need to use `pnpm` with this project

Installing pnpm
```bash
sudo npm install -g pnpm
```

### Checkout sources and install the packages
```bash
git clone https://github.com/relaytools/relaycreator
cd relaycreator
pnpm install
```

## Setting up your environment

```bash
cp env.develop .env
```

### Prisma ORM setup

This application requires MySQL and prisma ORM.

[How migrations work with prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)

We will setup the full dev environment in order to develop migrations locally if desired.

Example: Edit the `.env` file to add MySQL connection string(s)
```bash
DATABASE_URL="mysql://creator:creator@127.0.0.1:3306/creator"
SHADOW_DATABASE_URL="mysql://creator:creator@127.0.0.1:3306/creatorshadow"
```

Example: Create these databases and user on your MySQL server
```sql
create database creator;
create database creatorshadow;
GRANT ALL PRIVILEGES ON creator.* TO 'creator'@'%' IDENTIFIED BY 'creator';
GRANT ALL PRIVILEGES ON creator.* TO 'creator'@'%' IDENTIFIED BY 'creator';
FLUSH PRIVILEGES;
```

Deploy the current migrations:
```bash
pnpm prisma:migrate
```

### Build and start

Run the development server:

```bash
pnpm run dev
```

Build and run in production mode:

```bash
pnpm run build
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.