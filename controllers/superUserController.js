const ErrorHandler = require('../utils/errorhandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const User = require('../models/superUserModel');
const BusOwner = require('../models/busOwnerModel');
const Driver = require('../models/driverModel');
const BusRoute = require('../models/busRouteModel');
const Bus = require('../models/busModel');
const sendToken = require('../utils/jwtToken');
const { generateOtp, sendOtp } = require('../utils/sendSms');
const axios = require('axios');
const logger = require('../logger/index');
// let channel;
// //rabbitmq queue creation
// async function connect() {
//   const amqpServer = process.env.RABBITMQ_URL;
//   const connection = await amqp.connect(amqpServer);
//   channel = await connection.createChannel();
//   await channel.assertQueue('ADDEDDRIVER');
// }
// connect();

// createDemoSU = async () => {
//   const user = await User.create({
//     name: 'Bayezid',
//     phone: '01918139757',
//     pin: '3362',
//     email: 'me.bayezid@gmail.com',
//     role: 'admin',
//     approvalStatus: 'approved',
//   });
// };

// createDemoSU().then(() => {
//   console.log('Created Demo SU');
// });

//Register a superuser
exports.registerSuperUser = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const { name, phone, pin, email } = req.body;

  const user = await User.create({
    name,
    phone,
    email,
    pin,
    role: 'admin',
    addedBy: req.user._id.toString(),
  });

  res.json({
    success: true,
    message: `super user created with phone number: ${phone}`,
  });
  profiler.done({
    message: ` ${user.name} : ${user.phone} (${user._id}) added!`,

    level: 'warning',
    actionBy: req.user.id,
  });
});

//login module for superuser
exports.loginSuperUser = catchAsyncErrors(async (req, res, next) => {
  //checking if user has given pin and phone both

  const profiler = logger.startTimer();
  const { email, phone, pin } = req.body;
  if (!email && !phone) {
    return next(new ErrorHandler('Invalid login information', 400));
  }

  let user = phone
    ? await User.findOne({
        phone,
      }).select('+pin')
    : await User.findOne({ email }).select('+pin');

  if (!user) {
    return next(new ErrorHandler('Invalid login information', 401));
  }
  const ispinMatched = await user.comparepin(pin);

  if (!ispinMatched) {
    profiler.done({
      message: `Invalid pin given for ${
        phone ? 'phone number : ' + phone : 'email : ' + email
      }`,
      level: 'warning',
      actionBy: req.user.id,
    });
    return next(new ErrorHandler('Invalid login information', 401));
  }
  const otp = generateOtp();
  const update = {
    otp: otp,
    otpExpire: Date.now() + 5 * 60000,
  };

  user = phone
    ? await User.findOneAndUpdate({ phone }, update, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      }).select('id otp phone name')
    : await User.findOneAndUpdate({ email }, update, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      }).select('id otp phone name'); //sending otp for testing purposes
  //console.log(jk.otp);

  profiler.done({
    message: `User ${user.name} (${user.phone}) requested login otp`,
    level: 'info',
  });
  sendOtp(user.phone, otp);
  sendToken(user, 200, res);
});

//ADMIN module, approves bus owner after checking everything, needs to be an ADMIN, will be shifted when superuser module is ready
exports.approveBusOwner = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const user = await BusOwner.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`No user found with the id : ${req.params.id}`, 400)
    );
  }
  if (req.body.approvalStatus != 'approved') {
    user.approvalStatus = req.body.approvalStatus;
    await user.save({ validateBeforeSave: false });
    profiler.done({
      message: `Authority ${user.companyName} status updated to : ${req.body.approvalStatus}`,

      level: 'info',
      actionBy: req.user.id,
    });
    res.status(200).json({
      success: true,
      message: `${
        req.body.approvalStatus.charAt(0).toUpperCase() +
        req.body.approvalStatus.substring(1)
      } Authority`,
      user,
    });
  } else if (
    req.body.approvalStatus == 'approved' &&
    user.NIDBack &&
    user.NIDFront &&
    user.TINCertificate &&
    user.companyName &&
    user.tradeLicense &&
    user.merchantType &&
    user.merchantNumber &&
    user.busOwnerImage
  ) {
    user.approvalStatus = req.body.approvalStatus;
    await user.save({ validateBeforeSave: false });

    profiler.done({
      message: `Authority ${user.companyName} status updated to : ${req.body.approvalStatus}`,

      level: 'info',
      actionBy: req.user.id,
    });
    res.status(200).json({
      success: true,
      message: `${
        req.body.approvalStatus.charAt(0).toUpperCase() +
        req.body.approvalStatus.substring(1)
      } Authority`,
      user,
    });
  } else {
    profiler.done({
      message: `Could not approve ${user.companyName} due to lack of Documents`,

      level: 'warning',
      actionBy: req.user.id,
    });
    return next(
      new ErrorHandler(
        `Information Missing, cannot approve user with the id : ${req.params.id}`,
        400
      )
    );
  }
});

//ADMIN module, approves Driver after checking everything, needs to be an ADMIN, will be shifted when superuser module is ready
exports.approveDriver = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const user = await Driver.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`No user found with the id : ${req.params.id}`, 400)
    );
  }

  user.approvalStatus = req.body.approvalStatus;

  await user.save({ validateBeforeSave: false });

  profiler.done({
    message: `Driver ${user.name} with ID: ${req.params.id} was ${req.body.approvalStatus}`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    message: 'Approved Driver',
    user,
  });
});
//ADMIN module, approves Route after checking everything, needs to be an ADMIN, will be shifted when superuser module is ready

exports.approveRoute = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const route = await BusRoute.findById(req.params.id);
  if (!route) {
    return next(
      new ErrorHandler(`No Route found with the id : ${req.params.id}`, 400)
    );
  }

  route.approvalStatus = req.body.approvalStatus;
  await route.save({ validateBeforeSave: false });

  profiler.done({
    message: `Route ${route.name} with ID: ${req.params.id} was ${req.body.approvalStatus}`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    message: 'Approved Route',
    route,
  });
});

exports.approveBus = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const bus = await Bus.findById(req.params.id);
  if (!bus) {
    return next(
      new ErrorHandler(`No Bus found with the id : ${req.params.id}`, 400)
    );
  }

  bus.approvalStatus = req.body.approvalStatus;
  await route.save({ validateBeforeSave: false });

  profiler.done({
    message: `Bus ${bus.name} with ID: ${req.params.id} was ${req.body.approvalStatus}`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    message: 'Approved Route',
    bus,
  });
});

//verify OTP for superuser
exports.verifyOtp = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  if (!req.user) {
    return next(new ErrorHandler('Unauthorized request'));
  }
  const id = req.user.id;
  const user = await User.findOne({
    id: id,
    otpExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ErrorHandler('Otp is invalid or has expired', 400));
  }
  if (req.body.otp !== user.otp) {
    profiler.done({
      message: `Invalid otp tried for ${user.name} (${user.phone}) !`,
      level: 'warning',
    });
    return next(new ErrorHandler('Otp is invalid or has expired', 400));
  }

  user.otp = undefined;
  user.otpExpire = undefined;
  user.loggedIn = true;
  await user.save({ validateBeforeSave: false });
  profiler.done({
    message: `User ${user.name} (${user.phone}) logged in!`,
    level: 'warning',
  });
  sendToken(user, 200, res);
});

exports.logout = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const user = req.user;
  const id = user.id;
  if (user) {
    user.loggedIn = false;
    user.save({ validateBeforeSave: false });
  }

  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: 'Logged out',
  });
  profiler.done({
    message: 'Logged Out',
    level: 'info',
    actionBy: id,
  });
});
//get personal info of logged in user
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  let user;
  user = await User.findById(req.user.id);

  profiler.done({
    message: `User details of ${req.user.id} was requested`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    user,
  });
});

//get all bus owners

exports.getAllBusOwners = catchAsyncErrors(async (req, res, next) => {
  const users = await BusOwner.find();

  const profiler = logger.startTimer();

  profiler.done({
    message: `All bus owner information was requested`,
    level: 'info',
    actionBy: req.user.id,
  });

  res.status(200).json({
    success: true,
    users,
  });
});

//get all drivers

exports.getAllDrivers = catchAsyncErrors(async (req, res, next) => {
  const users = await Driver.find().populate('owner', 'companyName');

  const profiler = logger.startTimer();

  profiler.done({
    message: `All drivers' information was requested `,
    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    users,
  });
});

//get all routes

exports.getAllRoutes = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const routes = await BusRoute.find().populate('authorityId', 'companyName');

  profiler.done({
    message: `All routes information was requested`,
    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    routes,
  });
});
//get all buses

exports.getAllBuses = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const buses = await Bus.find().populate('owner', 'companyName');

  profiler.done({
    message: `All buses information was requested`,
    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    buses,
  });
});

//get single driver information
exports.getDriver = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const user = await Driver.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`No user found with the id : ${req.params.id}`, 400)
    );
  }

  profiler.done({
    message: `Information of Driver: ${user.name}-${req.params.id} was requested`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    user,
  });
});

//get single owner information
exports.getOwner = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const user = await BusOwner.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`No user found with the id : ${req.params.id}`, 400)
    );
  }

  profiler.done({
    message: `Information of Authority: ${user.name}-${req.params.id} was requested`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    user,
  });
});

//get single route information
exports.getRoute = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const route = await BusRoute.findById(req.params.id);
  if (!route) {
    return next(
      new ErrorHandler(`No route found with the id : ${req.params.id}`, 400)
    );
  }

  profiler.done({
    message: `Information of Route: ${route.name}-${req.params.id} was requested`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    route,
  });
});
//get single bus information
exports.getBus = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const bus = await Bus.findById(req.params.id);
  if (!bus) {
    return next(
      new ErrorHandler(`No route found with the id : ${req.params.id}`, 400)
    );
  }

  profiler.done({
    message: `Information of bus: ${bus.name}-${req.params.id} was requested`,

    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    bus,
  });
});

//delete driver
exports.deleteDriver = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  try {
    await Driver.deleteOne({
      _id: req.params.id,
    });
  } catch (error) {
    // console.log(error);
  }
  profiler.done({
    message: `Deleted Driver ${req.params.id}`,

    level: 'warning',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
  });
});

//delete owner
exports.deleteOwner = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  try {
    const result = await BusOwner.findOne({
      _id: req.params.id,
    });
    if (!result) {
      profiler.done({
        message: `Could not find Authority ${req.params.id} to Delete`,

        level: 'warning',
        actionBy: req.user.id,
      });

      return res.status(200).json({
        success: false,
        message: `No Authority found with id ${req.params.id}`,
      });
    }

    const drivers = result.drivers;
    const routes = result.routes;
    await Driver.deleteMany({ _id: drivers });
    await BusRoute.deleteMany({ _id: routes });
    await BusOwner.deleteOne({ _id: req.params.id });

    profiler.done({
      message: `Deleted Authority ${req.params.id} with all Drivers and Routes`,

      level: 'warning',
      actionBy: req.user.id,
    });
  } catch (error) {
    profiler.done({
      message: error,
      level: 'error',
      actionBy: req.user.id,
    });
  }
  return res.status(200).json({
    success: true,
    message: `Deleted Authority with id ${req.params.id}`,
  });
});

//delete route
exports.deleteRoute = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  try {
    await BusRoute.deleteOne({
      _id: req.params.id,
    });
  } catch (error) {
    //console.log(error);
  }
  profiler.done({
    message: `Deleted Route ${req.params.id}`,

    level: 'warning',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
  });
});
//delete bus
exports.deleteBus = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  try {
    await Bus.deleteOne({
      _id: req.params.id,
    });
  } catch (error) {
    //console.log(error);
  }
  profiler.done({
    message: `Deleted Bus ${req.params.id}`,

    level: 'warning',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
  });
});
