import httpStatus from "http-status";
import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meetingModel.js";

// Login
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User Not Found" });
    }

    let isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (isPasswordCorrect) {
      let token = crypto.randomBytes(20).toString("hex");

      user.token = token;
      await user.save();
      return res.status(httpStatus.OK).json({ token: token });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid Username or Password" });
    }
  } catch (e) {
    return res.status(500).json({ message: `Something went wrong ${e}` });
  }
};

// Register
const register = async (req, res) => {
  const { name, username, password } = req.body;

  if (!name?.trim() || !username?.trim() || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "Name, username, and password are required" });
  }

  try {
    const cleanedUsername = username.trim();
    const existingUser = await User.findOne({ username: cleanedUsername });
    if (existingUser) {
      return res
        .status(httpStatus.CONFLICT)
        .json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      username: cleanedUsername,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(httpStatus.CREATED).json({ message: "User registered" });
  } catch (e) {
    if (e.code === 11000) {
      return res
        .status(httpStatus.CONFLICT)
        .json({ message: "User already exists" });
    }

    console.error("Registration failed:", e);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not create the account. Please try again." });
  }
};

const getUserHistory = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json({ message: "Please log in again" });
  }

  try {
    const user = await User.findOne({ token: token });
    if (!user) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Please log in again" });
    }

    const meetings = await Meeting.find({ user_id: user.username });
    return res.status(httpStatus.OK).json(meetings);
  } catch (e) {
    console.error("Could not load history:", e);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not load meeting history" });
  }
};

const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  if (!token || !meeting_code?.trim()) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "A login token and meeting code are required" });
  }

  try {
    const user = await User.findOne({ token: token });
    if (!user) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Please log in again" });
    }

    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meeting_code.trim(),
    });
    await newMeeting.save();
    return res
      .status(httpStatus.CREATED)
      .json({ message: "Added code to history" });
  } catch (e) {
    console.error("Could not save history:", e);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not save meeting history" });
  }
};

export { login, register, getUserHistory, addToHistory };
