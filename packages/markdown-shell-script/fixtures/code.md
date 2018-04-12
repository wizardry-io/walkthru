# Code example

```js {src/App.js}
import React, { Component } from 'react'
import {
  Container,
  Nav,
  PinListPage,
  AddPinPage,
} from 'apollo-subscription-example-components'

class App extends Component {
  state = { pins: this.props.pins || [] }
  render() {
    return (
      <Container>
        <PinListPage pins={this.state.pins} />
        <AddPinPage
          addPin={pin => {
            this.setState(({ pins }) => ({ pins: pins.concat([pin]) }))
          }}
        />
        <Nav />
      </Container>
    )
  }
}

export default App
```

```{.env}
HOST=localhost
PORT=3001
PGDATABASE="pinapp"
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=
```

```js {$(ls migrations/*_create_pins_table.js)}
exports.up = knex =>
  knex.schema.createTable('pins', t => {
    t.increments('id').primary()
    t.string('title')
    t.string('link')
    t.string('image')
  })

exports.down = knex => knex.schema.dropTableIfExists('pins')
```
