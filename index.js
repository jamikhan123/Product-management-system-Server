const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
//middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello Product Management System");
});
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.atxig.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const verifyToken = async (req, res, next) => {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers?.authorization.split("Bearer ")[1];
    try {
      const decodedUser = jwt.verify(idToken, process.env.JWT_SECRET);
      req.decodedEmail = decodedUser.email;
    } catch (error) {
      error && res.status(401).json({ message: "UnAuthorized" });
    }
  }
  next();
};

async function run() {
  try {
    await client.connect();
    const database = client.db("productsUser");
    const productsCollection = database.collection("products");
    const userCollection = database.collection("users");

    //get all product
    app.get("/products", verifyToken, async (req, res) => {
      if (req.decodedEmail === req.body.email) {
        const result = await productsCollection.find({}).toArray();
        res.send(result);
      } else {
        res.status(401).json({ message: "UnAuthorized" });
      }
    });

    //get by id
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });

    //post product
    app.post("/addProduct", verifyToken, async (req, res) => {
      if (req.decodedEmail === req.body.user.email) {
        const result = await productsCollection.insertOne(req.body);
        res.json(result);
      } else {
        res.status(401).json({ message: "UnAuthorized" });
      }
    });

    //delete particular product
    app.delete("/products/:id", verifyToken, async (req, res) => {
      if (req.decodedEmail === req.body.email) {
        const result = await productsCollection.deleteOne({
          _id: ObjectId(req.params.id),
        });
        res.send(result);
      } else {
        res.status(401).json({ message: "UnAuthorized" });
      }
    });

    //update particular product
    app.patch("/products/:id", async (req, res) => {
      const newProduct = req.body;
      const filter = { _id: ObjectId(req.params.id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: newProduct.name,
          price: newProduct.price,
          quantity: newProduct.quantity,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //signup
    app.post("/signup", async (req, res) => {
      const hashPassword = await bcrypt.hash(req.body.password, 10);
      const user = {
        name: req.body.name,
        email: req.body.email,
        password: hashPassword,
      };
      const result = await userCollection.insertOne(user);
      res.json(result);
    });

    //get all user
    app.get("/users", async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("listening to the port", port);
});
