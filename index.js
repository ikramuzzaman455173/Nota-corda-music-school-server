const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
// const stripe = require("stripe")(process.env.payment_secreat_key);
// const jwt = require('jsonwebtoken');
const port = process.env.PORT || 4000
const cors = require('cors');

app.use(cors())
app.use(express.json())

//vairify jwt setup

const uri = `mongodb+srv://${process.env.dbuser}:${process.env.dbPass}@cluster0.izhktyr.mongodb.net/?retryWrites=true&w=majority`;

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
    const usersCollection = client.db('simpleDb').collection('users')










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('<h1 style="color:#333;text-align:center;font-size:20px;margin:10px 0;">Coffee Store Server Is Running !!!</h1>')
})

app.listen(port, () => {
  console.log(`The Server Is Running On Port: ${port}`)
})