const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express();
const stripe = require("stripe")("sk_test_51NHrkfBJXdTYCil7l72wRD1LcsrrZiiC3c4CNczcUqEVlDNrTF14r82qKJhJtGkNhWqr7MPYIECjRXnUrHCAN0oK00hJgoMJeZ");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())

// validate jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401)
      .send({ error: true, message: "Unauthorized Access" })
  }
  const token = authorization.split(" ")[1]
  // token verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401)
        .send({ error: true, message: "Unauthorized Access" })
    }
    req.decoded = decoded
    next()
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lw1wxb4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    // all collections
    const userCollection = client.db("sportsGenius").collection("users");
    const sportsCollection = client.db("sportsGenius").collection("sports");
    const cartCollection = client.db("sportsGenius").collection("carts");
    // jwt
    app.post("/jwt", (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2 days"
      })
      res.send({ token })
    })

    // save Users 
    // app.put("/users/:email", async (req, res) => {
    //   const email = req.params.email
    //   const user = req.body
    //   const query = { email: email }
    //   const options = { upsert: true }
    //   const updateDoc = {
    //     $set: user,
    //   }
    //   const result = await userCollection.updateOne(query, updateDoc, options)
    //   res.send(result)
    // })

    // all user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Delete Specific user.
    app.delete("/deleteUser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })

    // get all users details
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray()
      res.send(users)
    })

    // make admin
    app.patch('/users/makeAdmin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: "admin"
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // make instructor
    app.patch('/users/makeInstructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: "instructor"
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Approve class
    app.patch('/users/approveClass/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: "approve"
        },
      }
      const result = await sportsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    
    // Deny class
    app.patch('/users/denyClass/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: "deny"
        },
      }
      const result = await sportsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    
    // make student
    // app.patch('/users/makeStudent/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id)};
    //   const updateDoc = {
    //     $set: {
    //       role: "student"
    //     },
    //   }
    //   const result = await userCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // })

    // test api
    app.get("/test", (req, res) => {
      res.send("All is well")
    })

    // check admin
    app.get("/users/isAdmin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    // check instructor
    app.get("/users/isInstructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })
    // check student
    app.get("/users/isStudent/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { student: user?.role === 'student' }
      res.send(result);
    })

     // get specific user data using email
     app.get("/myClasses", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { instructorEmail: req?.query?.email }
        }
        const result = await sportsCollection.find(query).toArray();
        res.send(result)
      } catch (error) {
        res.send(error)
      }
    })

    // get all class data
    app.get("/allClasses", async (req, res) => {
      const sports = sportsCollection.find()
      const result = await sports.toArray()
      res.send(result)
    })

    // get single data 
    app.get("/singleData/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await sportsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })

     // Update specific data (single) 
     app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const updatedSportsData = req.body;
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          ...updatedSportsData
        }
      }
      const result = await sportsCollection.updateOne(query, updatedDoc, options)
      res.send(result)
    })

    // get single class
// app.get('/class/:id', async (req, res) => {
//   const id = req.params.id
//   const query = { _id: new ObjectId(id)}
//   const result = await sportsCollection.findOne(query)
//   res.send(result)
// } )

    // get get classes using sort based on total student(descending)
    app.get("/class/sort", async (req, res) => {
      const result = await sportsCollection.find().sort({ totalStudent: -1 }).toArray();
      const sixData = result.slice(0, 6)
      res.send(sixData)
    })
    // // get get instructors using sort based on total student(descending)
    // app.get("/topInstructor", async (req, res) => {
    //   const result = await sportsCollection.find().sort({ totalStudent: -1 }).toArray();
    //   const sixData = result.slice(0, 6)
    //   res.send(sixData)
    // })

    // insert/upload to db
    app.post("/add-a-class", async (req, res) => {
      const data = req.body;
      const result = await sportsCollection.insertOne(data)
      res.send(result)
    })

  // =============
  // cartCollection
  // save to cart
app.post("/carts", async (req, res) => {
  const item = req.body;
  const result = await cartCollection.insertOne(item);
  res.send(result)
})

// get cart data
app.get("/carts", async(req, res) => {
  const email = req.query.email;
  if(!email){
    req.send ([]);
  }
  const query = {email: email}
  const result = await cartCollection.find(query).toArray();
  res.send(result)
})


// create-payment-intent (PAYMENT)
// app.post("/create-payment-intent", verifyJWT, async (req, res) => {
// const  {price}  = req.body;
//   const amount = parseFloat(price) * 100
// console.log(amount);
//   // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: amount,
//     currency: "usd",
//     payment_method_types: ["card"]
//   });

//   res.send({
//     clientSecret: paymentIntent.client_secret,
//   });
// });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Sports genious server is running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})