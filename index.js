require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const port = process.env.PORT || 5000;
//

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://engrsakib-blood-donations-project.netlify.app"
    ], // Replace with your React app's URL
    credentials: true, // Allow credentials (cookies)
  })
);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});


// mongoDB server cannected

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_password}@cluster0.vnqi1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // database filed create
    const bloodCallectionUser = client
      .db("bloodCallections")
      .collection("users");
    const bloodCallectionDonation = client
      .db("bloodCallections")
      .collection("donations");
    const bloodCallectionBlogs = client
      .db("bloodCallections")
      .collection("blogs");
    const bloodCallectionFund = client
      .db("bloodCallections")
      .collection("funds");

    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//server run or not
app.get("/", (req, res) => {
  res.send("Blood donations server is running");
});

app.listen(port, () => {
  console.log(`blood donations is running on port ${port}`);
});
