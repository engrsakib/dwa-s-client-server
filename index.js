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

// coockis middleware
const logger = (req, res, next) => {
  next();
};
const veryfyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log(token)
  if (!token) {
    return res.status(401).send({ massage: "Unauthorize token" });
  }
  jwt.verify(token, process.env.JWT_SEC, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: "unauthorize access" });
    }
    req.decoded = decoded;
    next();
  });
};
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

    // user related query
    // get users
    app.get("/users/:mail", async (req, res) => {
      try {
        const email = req.params.mail;

        const result = await bloodCallectionUser.findOne({ email });

        if (!result) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SEC, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      try {
        res
          .clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (error) {
        console.log(error);
      }
    });
    // user added in database
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      // console.log(newUser);
      const result = await bloodCallectionUser.insertOne(newUser);
      res.send(result);
    });

    // user update
    app.put("/users/update/:id", async (req, res) => {
      const mail = req.params.id;
      const updateData = req.body;

      try {
        const filter = { email: mail };
        const updateDoc = {
          $set: {
            name: updateData.name,
            photoUrl: updateData.photoUrl,
            bloodGroup: updateData.bloodGroup,
            district: updateData.district,
            upazila: updateData.upazila,
            lastDonation: updateData.lastDonation || null,
          },
        };

        const result = await bloodCallectionUser.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ message: "User not found or invalid ID" });
        }

        res.status(200).json({
          message: "User profile updated successfully",
          result,
        });
      } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Failed to update user profile" });
      }
    });

    // all users
    app.get("/users", async (req, res) => {
      try {
        const result = await bloodCallectionUser.find({}).toArray();

        if (!result || result.length === 0) {
          return res.status(404).send({ message: "No users found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // user statuts update
    app.put("/users/status/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
          return res.status(400).send({ message: "Status is required" });
        }

        // console.log("User ID:", id);
        // console.log("Status:", status);

        const result = await bloodCallectionUser.updateOne(
          { _id: new ObjectId(id) }, // Make sure ObjectId is imported correctly
          { $set: { status: status } } // Correctly set the status field
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "User not found or status is already the same" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).send({ message: "Failed to update status" });
      }
    });

    // user Delete function
    app.delete("/users/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await bloodCallectionUser.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete user" });
      }
    });

    // update roles
    app.put("/users/role/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body;
        const result = await bloodCallectionUser.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update role" });
      }
    });

    // donations related works

    // all data get
    app.get("/donations", async (req, res) => {
      try {
        const result = await bloodCallectionDonation.find({}).toArray();

        if (!result || result.length === 0) {
          return res.status(204).send({ message: "No data found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // user based data get
    app.get("/donations/:mail", async (req, res) => {
      try {
        const email = req.params.mail;

        // Find all documents related to the user email
        const result = await bloodCallectionDonation.find({ email }).toArray();

        if (!result || result.length === 0) {
          return res
            .status(204)
            .send({ message: "No data found for this user" });
        }

        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching user donations:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/donations/home/:mail", async (req, res) => {
      try {
        const email = req.params.mail;

        // Find documents with "pending" status and matching email
        const result = await bloodCallectionDonation
          .find({ email, status: "pending" })
          .sort({ createdAt: 1 })
          .limit(3)
          .toArray();

        if (!result || result.length === 0) {
          return res
            .status(204)
            .send({ message: "No pending data found for this user" });
        }

        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching pending user donations:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    //  all donations for home pages
    app.get("/all-donations", async (req, res) => {
      try {
        const result = await bloodCallectionDonation
          .find({ status: "pending" })
          .toArray();

        if (!result || result.length === 0) {
          return res.status(204).send({ message: "No data found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // donation status update
    app.patch("/donations/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await bloodCallectionDonation.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update donation status" });
      }
    });

    // donations search
    app.post("/all-donations/filter", async (req, res) => {
      const { district, bloodGroup, upazila } = req.body;

      try {
        const query = {};
        // query["$or"] = [];
        // if (district) query["$or"].push({ district });
        // if (bloodGroup) query["$or"].push({ bloodGroup });

        if (district) {
          query.district = district;
        }
        if (bloodGroup) {
          query.bloodGroup = bloodGroup;
        }

        if (upazila) {
          query.upazila = upazila;
        }
        // console.log("Filter Query:", query);

        const filteredDonations = await bloodCallectionUser
          .find(query)
          .toArray();

        // console.log(filteredDonations);
        // if (filteredDonations.length === 0) {
        //   return res.status(404).send({ message: "No Data Found" });
        // }

        res.status(200).send(filteredDonations);
      } catch (error) {
        console.error("Error fetching donations:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // donations delete
    app.delete("/donations/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await bloodCallectionDonation.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Donation not found" });
        }
        res.status(200).send({ message: "Donation deleted successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete donation" });
      }
    });

    // get onte by Id
    app.get("/donations/edit/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const donation = await bloodCallectionDonation.findOne({
          _id: new ObjectId(id),
        });
        if (!donation) {
          return res.status(404).send({ message: "Donation not found" });
        }
        res.status(200).send(donation);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch donation details" });
      }
    });

    // update backed code
    app.put("/donations/edit/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      try {
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            recipientName: updateData.recipientName,
            district: updateData.district,
            upazila: updateData.upazila,
            hospital: updateData.hospital,
            address: updateData.address,
            bloodGroup: updateData.bloodGroup,
            donationDate: updateData.donationDate,
            donationTime: updateData.donationTime,
            requestMessage: updateData.requestMessage,
          },
        };

        const result = await bloodCallectionDonation.updateOne(
          filter,
          updateDoc
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ message: "Donation request not found or invalid ID" });
        }

        res.status(200).json({
          message: "Donation request updated successfully",
          result,
        });
      } catch (error) {
        console.error("Error updating donation request:", error);
        res
          .status(500)
          .json({ message: "Failed to update donation request", error });
      }
    });

    // donations posts
    app.post("/donations", async (req, res) => {
      const newData = req.body;
      // console.log(newUser);
      const result = await bloodCallectionDonation.insertOne(newData);
      res.status(200).send(result);
    });

    // blogs related works

    // all blogs for admin
    app.get("/blogs", async (req, res) => {
      try {
        const result = await bloodCallectionBlogs.find({}).toArray();

        if (!result || result.length === 0) {
          return res.status(404).send({ message: "No users found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // status based blogs
    app.get("/blogs/status", async (req, res) => {
      try {
        // Filter blogs with status "published"
        const result = await bloodCallectionBlogs
          .find({ status: "published" })
          .toArray();

        if (!result || result.length === 0) {
          return res.status(404).send({ message: "No published blogs found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // blogs status update
    app.patch("/blogs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body; // The new status coming from the request body

        // Check if the ObjectId is valid
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        // Update the blog status in the database
        const result = await bloodCallectionBlogs.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Blog not found or status is the same" });
        }

        res.status(200).send(result); // Send back the result
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).send({ message: "Failed to update blog status" });
      }
    });

    // blogs delete
    app.delete("/blogs/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        // Delete the blog from the database
        const result = await bloodCallectionBlogs.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Blog not found" });
        }

        res.status(200).send({ message: "Blog deleted successfully" });
      } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).send({ message: "Failed to delete blog" });
      }
    });

    // blogs details
    app.get("/blogs/details/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const donation = await bloodCallectionBlogs.findOne({
          _id: new ObjectId(id),
        });
        if (!donation) {
          return res.status(404).send({ message: "Blogs not found" });
        }
        res.status(200).send(donation);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch Blogs details" });
      }
    });

    // blogs post
    app.post("/blogs", async (req, res) => {
      const newData = req.body;
      // console.log(newUser);
      const result = await bloodCallectionBlogs.insertOne(newData);
      res.status(200).send(result);
    });

    // funding related works

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body;
      // console.log(amount, email, name);
      const cent = amount * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cent,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.status(200).send(paymentIntent.client_secret);
    });

    // get all fund
    app.get("/users/add-fund/all", async (req, res) => {
      try {
        const result = await bloodCallectionFund.find().toArray();
        // console.log(result)
        if (!result || result.length === 0) {
          return res.status(204).send({ message: "No data found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });
    app.get("/users/add-fund/all/tk", async (req, res) => {
      try {
        const result = await bloodCallectionFund.find().toArray();
        // console.log(result)
        if (!result || result.length === 0) {
          return res.status(204).send({ message: "No data found" });
        }
        let total = 0;
        result.forEach((element) => {
          total += element.amount;
        });
        res.send({ total });
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // fund post
    app.post("/users/add-fund", async (req, res) => {
      const newData = req.body;
      const result = await bloodCallectionFund.insertOne(newData);
      res.status(200).send(result);
    });
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
