const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS:5000 },(err,db)=>{

  if(err) console.log("connection error");
});
const {Schema} = mongoose;

const ExcerciceSchema = new Schema({
  description:{type:String, required:true},
  duration: {type:Number, required:true},
  date: {type:String,required:false},
})

const userSchema = new Schema({
  username:String,
  log:[ExcerciceSchema]
})

const User = mongoose.model('User',userSchema);
const Excercise = mongoose.model('Exercise',ExcerciceSchema);




app.use(cors())
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users',async(req,res)=>{
  const {username} = req.body;
  const isUserExists = await User.findOne({username})
  if(isUserExists) return res.json({error:"user already exists"});

  const newUser =  new User({
    username: req.body.username,
  })


 await newUser.save((err,data)=>{
    if(err||!data) return res.json({error:"database error"});

    return res.json(data);
  })
})

app.post('/api/users/:_id/exercises',async(req,res)=>{

  const _id = req.params._id;
  // User.find({id});
  const user = await User.findOne({_id})
  if(!user) return res.json({error:"user not exists"});

  // let checkedDate = new Date(/\d\d\d\d-\d\d-\d\d/.test(req.body.date)?req.body.date:Date.now());

  const {description,duration} = req.body;
  const exc = new Excercise({
   description,
  duration: parseInt(duration),
  date:req.body.date  ? 
                        (new Date(req.body.date)).toDateString()
                        : 
                        (new Date()).toDateString(),
  })

  User.findByIdAndUpdate(
    _id,
    {$push:{log:exc}},
    {new: true},
    (error,updateUser)=>{
      if(!error){
        let response = {};
        response['_id'] = updateUser.id;
        response['username'] = updateUser.username;
        response['description'] = exc.description;
        response['duration'] = exc.duration;
        response['date'] = (new Date(exc.date)).toDateString()
        res.json(response);

      }
    }

  )
    


})

app.get('/api/users/',async(req,res)=>{
  User.find({},(err,data)=>{
    if(!data) return res.send("no users");
    res.json(data);
  })
})

app.get('/api/users/:_id/logs',async(req,res)=>{
  const {from, to, limit} = req.query;
  const {_id} = req.params; 
  // console.log(req.query, req.params);


  let user = await User.findById({_id})
  if(!user) return res.json({error:"user not exists"});
  const dateObj ={};
  let fromDate=new Date(0);
  let toDate=new Date();
  if(from ){
    fromDate = new Date(from);
  }
  if(to){
    toDate = new Date(to);
  }
  fromDate = fromDate.getTime();
  toDate =toDate.getTime();

  console.log("raw user",user);

  user.log =user.log.filter((s)=>{
    let sDate = new Date(s.date).getTime();

    return sDate >= fromDate && sDate <= toDate;
  })

  if(limit) 
    user.log = user.log.slice(0,limit);
  
  user = user.toJSON();
  user['count']=user.log.length;
  user['date']= new Date(user['date']).toDateString();
  console.log(user);
  res.json(user);

  
 // res.json({test:"test"});
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
