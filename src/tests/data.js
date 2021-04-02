import faker from 'faker'



export const userOne  = {
  username: faker.name.firstName(),
  password: 'password',
}

export const userTwo  = {
    username: faker.name.firstName(),
    password: 'password',
  }

export const fakeUser = {
    username: faker.name.findName()
}

export const inValidAccount = {
  username: faker.name.firstName(),
  password: 'password'
}

