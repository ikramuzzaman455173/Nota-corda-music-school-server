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
    // await client.connect();
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

    // varifyInstruccor Jwt
    const varifyInstructorJwt = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next()
    }


    // database users data hanlde api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    // all users data related routes
    app.get('/users/instructor/:email', varifyJwt, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })




    // summer camp school classes
    app.get('/allClass', async (req, res) => {
      const result = await classesCollection.find({}).toArray()
      res.send(result);
    });

    // allClass get instructor api
    app.get('/instructorClass', varifyJwt, async (req, res) => {
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
      const result = await classesCollection.find(query).toArray()
      // console.log(result,'result');
      res.send(result)
    })

    // get single instructor class data data
    app.get('/allClass/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const query = { _id: new ObjectId(id) }
      const singleClass = await classesCollection.findOne(query);
      res.send(singleClass)
    })


    //all allClass api new class add
    app.post('/allClass', varifyJwt, varifyInstructorJwt, async (req, res) => {
      const classData = req.body;
      // console.log(classData,'classData');
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    })

    //all allClass api new class add
    app.put('/allClass/:id', varifyJwt, varifyInstructorJwt, async (req, res) => {
      const id = req.params.id
      const updateClass = req.body;
      // console.log(classData,'classData');
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateClassData = {
        $set: {
          instructor_name: updateClass.instructor_name,
          email: updateClass.email,
          class_name: updateClass.class_name,
          price: updateClass.price,
          image: updateClass.image,
          class_level: updateClass.class_level,
          description: updateClass.description,
          class_duration: updateClass.class_duration,
          available_seats: updateClass.available_seats,
          status: updateClass.status,
          students: updateClass.students,
        },
      };
      const result = await classesCollection.updateOne(filter, updateClassData, options);
      res.send(result);
    })

    // instructor class delete api
    app.delete('/allClass/:id', varifyJwt, varifyInstructorJwt, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.deleteOne(query)
      res.send(result)
    })



    // summer camp school allInstructors
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find({}).toArray()
      res.send(result)
    })

    // select classes part
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
      // console.log('price', price, 'amount', amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    app.post('/payments', varifyJwt, async (req, res) => {
      try {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
        const classId = payment.selectClassId;
        const selectClassId = payment.selectClassItems
        // console.log(selectClassId);
        const classData = await classesCollection.findOne({ _id: new ObjectId(classId) });
        if (classData.available_seats === 0) {
          throw new Error('No available seats');
        }

        const updateResult = await classesCollection.updateOne(
          { _id: new ObjectId(classId), available_seats: { $gt: 0 } },
          { $inc: { available_seats: -1, students: 1 } }
        );

        const updateSelectClass = await selectClassesCollection.updateOne(
          { _id: new ObjectId(selectClassId) },
          { $set: { payment: true } }
        );


        // console.log(updateResult, 'up');
        // console.log(updateSelectClass, 'updates');

        res.send({ success: true, message: 'Payment successful', insertResult, updateResult, updateSelectClass });
      } catch (error) {
        res.status(500).send({ success: false, message: 'Payment failed', error });
      }
    });


    // // payment history api
    app.get('/paymentHistory', varifyJwt, async (req, res) => {
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
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
      // console.log(result,'result');
      res.send(result)
    })

    //payment history delete
    app.delete('/payHistory/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await paymentCollection.deleteOne(query)
      res.send(result)
    })




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
