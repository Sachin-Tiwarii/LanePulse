import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    password_hash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "operator"],
      default: "operator",
      required: true,
    },
  },
  {
    timestamps: false,
    strict: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;