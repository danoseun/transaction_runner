

[![Build Status](https://www.travis-ci.com/danoseun/transaction_runner.svg?branch=master)](https://www.travis-ci.com/danoseun/transaction_runner)


# ghalib-case-manager-backend

## Description
The objective of this project is to simulate transactions



## Table of Content

- [Documentation](#documentation)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Testing](#testing)


## Documentation
The API documentation is available [here](https://documenter.getpostman.com/view/2851236/TzCP8T9f).

### System Requirements
Your system will need to have the following software installed:

  * [Node](https://nodejs.org/en/download/)
  * [Postgres](https://www.postgresql.org/)

## Installation
#### Step 1: Clone the repository

```bash
git clone https://github.com/danoseun/transaction_runner
cd transaction_runner
```

#### Step 2: Setup database
Create a new postgres database

#### Step 3: Setup environment variables
Include necessary variables as found in .env.sample into .env 

#### Step 4: Install NPM packages
```bash
npm i
```

#### Step 5: Start in development mode
```bash
npm run dev
```

#### Step 6: Make database migration and seed data
```bash
npm run migrate
npm run seed
```

## Testing
```bash
npm test
```




