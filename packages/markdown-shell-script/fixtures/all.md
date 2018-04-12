# GraphQL Subscriptions

## Bootstrap client

```bash
cd ~
mkdir pinapp
cd pinapp
# Install or update create-react-app
yarn global add create-react-app
# Create client
create-react-app client
# Go to /client
cd client
# Install pm2 so we can start app on background
# https://github.com/facebook/create-react-app/issues/1089#issuecomment-294428373
yarn global add pm2
# Start the app
pm2 start node_modules/react-scripts/scripts/start.js --name pinapp
```

```bash
yarn add apollo-subscription-example-components
```

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

## Bootstrap server

```bash
# Create server folder. We assume that you are inside client folder at this point.
mkdir ../server
# Go to server folder
cd ../server
# Create package.json
yarn init -y
# Create index file
touch index.js
```

```bash
yarn add dotenv
yarn add run.env --dev
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

```bash
npx run.env createdb pinapp
```

```bash
# Add dependencies
yarn add pg knex
# Init knex. This creates a configuration file called knexfile.js
npx knex init
```

```{knexfile.js}
module.exports = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations"
    }
  },

  staging: {
    client: "postgresql",
    connection: {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations"
    }
  },

  production: {
    client: "postgresql",
    connection: {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: true
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations"
    }
  }
};
```

```bash
npx run.env knex migrate:make create_pins_table
```

```js $(ls migrations/*_create_pins_table.js)
exports.up = knex =>
  knex.schema.createTable('pins', t => {
    t.increments('id').primary()
    t.string('title')
    t.string('link')
    t.string('image')
  })

exports.down = knex => knex.schema.dropTableIfExists('pins')
```

```bash
npx run.env knex migrate:latest
```

```bash
yarn add express body-parser apollo-server-express graphql-tools graphql
```

```js {index.js}
require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const { execute, subscribe } = require('graphql')
const { createServer } = require('http')

const database = require('./database')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'
```

```js database.js
const knex = require("knex")(
  require("./knexfile")[process.env.NODE_ENV || "development"]
);

module.exports = knex;
```

```js {index.js}
require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')

const database = require('./database')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

const typeDefs = `
  type Pin { title: String!, link: String!, image: String!, id: Int! }
  type Query { pins: [Pin] }
`

const resolvers = {
  Query: {
    pins: async () => {
      const pins = await database('pins').select()
      return pins
    },
  },
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
const server = express()

server.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))

server.use(
  '/graphiql',
  graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://${HOST}:${PORT}/subscriptions`,
  })
)

server.listen(PORT, () => {
  console.log(`Go to http://${HOST}:${PORT}/graphiql to run queries!`)
})
```

```diff
--- package.json
+++ package.json
@@ -10,5 +10,11 @@
   },
   "devDependencies": {
     "run.env": "^1.0.1"
+  },
+  "scripts": {
+    "start": "node index.js",
+    "dev": "pm2 start --watch index.js --name pinapp-api",
+    "db:create": "run.env createdb pinapp",
+    "db:migrate": "run.env knex migrate:latest"
   }
 }
```

```bash
yarn dev
```

```diff
--- index.js
+++ index.js
@@ -13,6 +13,7 @@
 const typeDefs = `
   type Pin { title: String!, link: String!, image: String!, id: Int! }
   type Query { pins: [Pin] }
+  type Mutation { addPin(title: String!, link: String!, image: String!): Int }
 `

 const resolvers = {
@@ -22,6 +23,14 @@
       return pins
     },
   },
+  Mutation: {
+    addPin: async (_, { title, link, image }) => {
+      const [id] = await database('pins')
+        .returning('id')
+        .insert({ title, link, image });
+      return id;
+    }
+  }
 }

 const schema = makeExecutableSchema({
```

```bash
yarn add subscriptions-transport-ws graphql-postgres-subscriptions
```

```diff
--- index.js
+++ index.js
@@ -4,7 +4,19 @@
 const bodyParser = require('body-parser')
 const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
 const { makeExecutableSchema } = require('graphql-tools')
+const { execute, subscribe } = require('graphql')
+const { createServer } = require('http')
+const { SubscriptionServer } = require('subscriptions-transport-ws')
+const { PostgresPubSub } = require('graphql-postgres-subscriptions')

+const pubsub = new PostgresPubSub({
+  user: process.env.USER,
+  host: process.env.PGHOST,
+  database: process.env.PGDATABASE,
+  password: process.env.PGPASSWORD,
+  port: process.env.PGPORT,
+})
+
 const database = require('./database')

 const PORT = process.env.PORT || 3000
@@ -14,6 +26,7 @@
   type Pin { title: String!, link: String!, image: String!, id: Int! }
   type Query { pins: [Pin] }
   type Mutation { addPin(title: String!, link: String!, image: String!): Int }
+  type Subscription { pinAdded: Pin }
 `

 const resolvers = {
@@ -28,9 +41,15 @@
       const [id] = await database('pins')
         .returning('id')
         .insert({ title, link, image });
+      pubsub.publish('pinAdded', { pinAdded: { title, link, image, id } });
       return id;
     }
-  }
+  },
+  Subscription: {
+    pinAdded: {
+      subscribe: () => pubsub.asyncIterator('pinAdded'),
+    },
+  },
 }

 const schema = makeExecutableSchema({
@@ -49,6 +68,19 @@
   })
 )

-server.listen(PORT, () => {
+const ws = createServer(server)
+
+ws.listen(PORT, () => {
   console.log(`Go to http://${HOST}:${PORT}/graphiql to run queries!`)
+  new SubscriptionServer(
+    {
+      execute,
+      subscribe,
+      schema,
+    },
+    {
+      server: ws,
+      path: '/subscriptions',
+    }
+  )
 })
```

## Setup React Apollo

```bash
cd ../client
yarn add apollo-cache-inmemory apollo-client apollo-link apollo-link-error apollo-link-http graphql graphql-tag react-apollo
```

```js {src/App.js}
import React, { Component } from "react";
import {
  Container,
  Nav,
  PinListPage,
  AddPinPage,
  Spinner
} from "apollo-subscription-example-components";
import gql from "graphql-tag";
import { ApolloProvider, Query, Mutation } from "react-apollo";
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import { onError } from "apollo-link-error";
import { ApolloLink } from "apollo-link";

const client = new ApolloClient({
  link: ApolloLink.from([
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.map(({ message, locations, path }) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          )
        );
      if (networkError) console.log(`[Network error]: ${networkError}`);
    }),
    new HttpLink({
      uri: "http://localhost:3001/graphql",
      credentials: "same-origin"
    })
  ]),
  cache: new InMemoryCache()
});

class App extends Component {
  state = { pins: this.props.pins || [] };
  render() {
    return (
      <ApolloProvider client={client}>
        <Container>
          <PinListPage pins={this.state.pins} />
          <AddPinPage
            addPin={pin => {
              this.setState(({ pins }) => ({ pins: pins.concat([pin]) }));
            }}
            />
          <Nav />
        </Container>
      </ApolloProvider>
    );
  }
}

export default App;
```

```bash
cd ../server
yarn add cors
```

```diff
--- index.js
+++ index.js
@@ -8,6 +8,7 @@
 const { createServer } = require('http')
 const { SubscriptionServer } = require('subscriptions-transport-ws')
 const { PostgresPubSub } = require('graphql-postgres-subscriptions')
+const cors = require('cors')

 const pubsub = new PostgresPubSub({
   user: process.env.USER,
@@ -57,6 +58,8 @@
   resolvers,
 })
 const server = express()
+
+server.use(cors())

 server.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
```

```bash
pm2 restart pinapp-api
```

```bash
cd ../client
```

```js {src/App.js}
import React, { Component } from "react";
import {
  Container,
  Nav,
  PinListPage,
  AddPinPage,
  Spinner
} from "apollo-subscription-example-components";
import gql from "graphql-tag";
import { ApolloProvider, Query, Mutation } from "react-apollo";
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import { onError } from "apollo-link-error";
import { ApolloLink } from "apollo-link";

const client = new ApolloClient({
  link: ApolloLink.from([
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.map(({ message, locations, path }) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          )
        );
      if (networkError) console.log(`[Network error]: ${networkError}`);
    }),
    new HttpLink({
      uri: "http://localhost:3001/graphql",
      credentials: "same-origin"
    })
  ]),
  cache: new InMemoryCache()
});

const PINS_QUERY = gql`
  {
    pins {
      title
      link
      image
      id
    }
  }
`;

const PinsQuery = ({ children }) => (
  <Query query={PINS_QUERY}>
    {({ loading, error, data }) => {
      if (loading)
        return (
          <div style={{ paddingTop: 20 }}>
            <Spinner show />
          </div>
        );
      if (error) return <p>Error :(</p>;

      return children(data.pins);
    }}
  </Query>
);

const AddPinMutation = ({ children }) => (
  <Mutation
    mutation={gql`
      mutation AddPin($title: String!, $link: String!, $image: String!) {
        addPin(title: $title, link: $link, image: $image)
      }
    `}
    refetchQueries={[{ query: PINS_QUERY }]}
  >
    {(addPin, { data, loading, error }) =>
      children(addPin, { data, loading, error })
    }
  </Mutation>
);

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <Container>
          <PinsQuery>{pins => <PinListPage pins={pins} />}</PinsQuery>
          <AddPinMutation>
            {(addPin, { data, loading, error }) => (
              <AddPinPage
                addPin={({ title, link, image }) =>
                  addPin({ variables: { title, link, image } })
                }
              />
            )}
          </AddPinMutation>
          <Nav />
        </Container>
      </ApolloProvider>
    );
  }
}

export default App;
```

```bash
yarn add apollo-link-ws subscriptions-transport-ws
```

```{.env.local}
REACT_APP_API_URI=http://localhost:3001/graphql
REACT_APP_WS_URI=ws://localhost:3001/subscriptions
```

```bash
pm2 restart pinapp
```

```diff
--- src/App.js
+++ src/App.js
@@ -13,7 +13,15 @@
 import { HttpLink } from "apollo-link-http";
 import { onError } from "apollo-link-error";
 import { ApolloLink } from "apollo-link";
+import { WebSocketLink } from "apollo-link-ws";

+const wsLink = new WebSocketLink({
+  uri: process.env.REACT_APP_WS_URI,
+  options: {
+    reconnect: true
+  }
+});
+
 const client = new ApolloClient({
   link: ApolloLink.from([
     onError(({ graphQLErrors, networkError }) => {
@@ -25,8 +33,9 @@
         );
       if (networkError) console.log(`[Network error]: ${networkError}`);
     }),
+    wsLink,
     new HttpLink({
-      uri: "http://localhost:3001/graphql",
+      uri: process.env.REACT_APP_API_URI,
       credentials: "same-origin"
     })
   ]),
@@ -44,9 +53,20 @@
   }
 `;

+const PINS_SUBSCRIPTION = gql`
+  subscription {
+    pinAdded {
+      title
+      link
+      image
+      id
+    }
+  }
+`;
+
 const PinsQuery = ({ children }) => (
   <Query query={PINS_QUERY}>
-    {({ loading, error, data }) => {
+    {({ loading, error, data, subscribeToMore }) => {
       if (loading)
         return (
           <div style={{ paddingTop: 20 }}>
@@ -54,8 +74,22 @@
           </div>
         );
       if (error) return <p>Error :(</p>;
+      const subscribeToMorePins = () => {
+        subscribeToMore({
+          document: PINS_SUBSCRIPTION,
+          updateQuery: (prev, { subscriptionData }) => {
+            if (!subscriptionData.data || !subscriptionData.data.pinAdded)
+              return prev;
+            const newPinAdded = subscriptionData.data.pinAdded;

-      return children(data.pins);
+            return Object.assign({}, prev, {
+              pins: [...prev.pins, newPinAdded]
+            });
+          }
+        });
+      };
+
+      return children(data.pins, subscribeToMorePins);
     }}
   </Query>
 );
@@ -67,7 +101,6 @@
         addPin(title: $title, link: $link, image: $image)
       }
     `}
-    refetchQueries={[{ query: PINS_QUERY }]}
   >
     {(addPin, { data, loading, error }) =>
       children(addPin, { data, loading, error })
@@ -76,25 +109,35 @@
 );

 class App extends Component {
+  componentDidMount() {
+    this.props.subscribeToMorePins();
+  }
   render() {
     return (
-      <ApolloProvider client={client}>
-        <Container>
-          <PinsQuery>{pins => <PinListPage pins={pins} />}</PinsQuery>
-          <AddPinMutation>
-            {(addPin, { data, loading, error }) => (
-              <AddPinPage
-                addPin={({ title, link, image }) =>
-                  addPin({ variables: { title, link, image } })
-                }
-              />
-            )}
-          </AddPinMutation>
-          <Nav />
-        </Container>
-      </ApolloProvider>
+      <Container>
+        <PinListPage pins={this.props.pins} />
+        <AddPinMutation>
+          {(addPin, { data, loading, error }) => (
+            <AddPinPage
+              addPin={({ title, link, image }) =>
+                addPin({ variables: { title, link, image } })
+              }
+            />
+          )}
+        </AddPinMutation>
+        <Nav />
+      </Container>
     );
   }
 }

-export default App;
+export default () => (
+  <ApolloProvider client={client}>
+    <PinsQuery>
+      {/* Wrap App with PinsQuery because we need to access subscribeToMorePins in componentDidMount */}
+      {(pins, subscribeToMorePins) => (
+        <App pins={pins} subscribeToMorePins={subscribeToMorePins} />
+      )}
+    </PinsQuery>
+  </ApolloProvider>
+);
```
