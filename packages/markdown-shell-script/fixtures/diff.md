# Diff example

```diff
--- package.json
+++ package.json
@@ -10,5 +10,11 @@
   },
   "devDependencies": {
     "run.env": "^1.0.1"
+  },
+  "scripts": {
+    "start: "node index.js",
+    "dev": "pm2 start --watch index.js --name pinapp-api",
+    "db:create": "run.env createdb pinapp",
+    "db:migrate": "run.env knex migrate:latest"
   }
 }
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