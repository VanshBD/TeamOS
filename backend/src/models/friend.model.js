import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },   // clerkId
    receiver: { type: String, required: true }, // clerkId
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate requests
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
