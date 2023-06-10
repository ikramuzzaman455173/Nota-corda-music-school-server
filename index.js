const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const stripe = require("stripe")(process.env.payment_secreat_key);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 4000
const cors = require('cors');

app.use(cors())
app.use(express.json())

//vairify jwt setup
const varifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  //bearer token
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.access_token_secreat_key, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded
    next()
  })
}

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
    const usersCollection = client.db('summerCampSchool').collection('users')
    const classesCollection = client.db('summerCampSchool').collection('allClasses')
    const instructorsCollection = client.db('summerCampSchool').collection('instructors')
    const selectClassesCollection = client.db('summerCampSchool').collection('selectClasses')
    const paymentCollection = client.db('summerCampSchool').collection('payments')

    //post jwt
    app.post('/jwt', (req, res) => {
      const user = req.body
      // console.log('user',user);
      const token = jwt.sign(user, process.env.access_token_secreat_key, { expiresIn: '1h' })
      res.send({ token })
    })

    //put all users
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      console.log(`email:${email}`);
      const user = req.body
      console.log(`user:`, user);
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      // console.log('result', result);
      res.send(result)
    })


    // summer camp school classes
    app.get('/allClass', async (req, res) => {
      const result = await classesCollection.find({}).toArray()
      res.send(result);
    });


    // summer camp school allInstructors
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find({}).toArray()
      res.send(result)
    })

    // select classes part
    //carts collections related api
    app.get('/selectClasses', varifyJwt, async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await selectClassesCollection.find(query).toArray()
      // console.log(result,'result');
      res.send(result)
    })


    app.post('/selectClasses', async (req, res) => {
      const item = req.body
      // console.log(item,'item');
      const result = await selectClassesCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/selectClasses/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await selectClassesCollection.deleteOne(query)
      res.send(result)
    })





    // create payments intent
    app.post('/payment', varifyJwt, async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      console.log('price', price, 'amount', amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // // payment related api
    // app.post('/payments',varifyJwt,async (req,res) => {
    //   const payment = req.body
    //   const insertResult = await paymentCollection.insertOne(payment)

    //   // const query = {_id:{$in:payment.cartItems?.map(id => new ObjectId(id)) } }
    //   // console.log(payment,'payment');
    //   const query = {_id: { $in:payment.selectClassItems.map(id => new ObjectId(id)) }}
    //   const updateResult = await selectClassesCollection.updateMany(query, { $set: { payment: true } });
    //   res.send({insertResult,updateResult})
    // })


    // app.post('/payments',varifyJwt, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment)
    //     const classIds = payment.selectClassId
    //     const updateResult = await classesCollection.updateOne(
    //       { _id: { $in: classIds } },
    //       { $inc: { available_seats: -1 } }
    //     );

    //     console.log(updateResult,'up');

    //     res.send({ success: true, message: 'Payment successful',insertResult, updateResult });
    //   } catch (error) {
    //     res.status(500).send({ success: false, message: 'Payment failed', error });
    //   }
    // });


    app.post('/payments', varifyJwt, async (req, res) => {
      try {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
        const classId = payment.selectClassId;

        const updateResult = await classesCollection.updateOne(
          { _id: classId },
          { $inc: { available_seats: -1 } }
        );

        // console.log(updateResult, 'up');

        res.send({ success: true, message: 'Payment successful', insertResult, updateResult });
      } catch (error) {
        res.status(500).send({ success: false, message: 'Payment failed', error });
      }
    });




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
  res.send('<h1 style="color:#333;text-align:center;font-size:20px;margin:10px 0;">Summer Camp School Server Is Running !!!</h1>')
})

app.listen(port, () => {
  console.log(`Summer Camp School Server Is Running On Port:http://localhost:${port}`);
})
