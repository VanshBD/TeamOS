import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useChatContext } from "stream-chat-react";
import * as Sentry from "@sentry/react";
import toast from "react-hot-toast";
import { AlertCircleIcon, HashIcon, LockIcon, UsersIcon, XIcon, LinkIcon, CopyIcon } from "lucide-react";

const CreateChannelModal = ({ onClose }) => {
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("public");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [_, setSearchParams] = useSearchParams();
  const [createdChannelId, setCreatedChannelId] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const { client, setActiveChannel } = useChatContext();

  // fetch users for member selection
  useEffect(() => {
    const fetchUsers = async () => {
      if (!client?.user) return;
      setLoadingUsers(true);

      try {
        const response = await client.queryUsers(
          { id: { $ne: client.user.id } },
          { name: 1 },
          { limit: 100 }
        );

        const usersOnly = response.users.filter((user) => !user.id.startsWith("recording-"));

        setUsers(usersOnly || []);
      } catch (error) {
        console.log("Error fetching users");
        Sentry.captureException(error, {
          tags: { component: "CreateChannelModal" },
          extra: { context: "fetch_users_for_channel" },
        });
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [client]);

  // reset the form on open: this is not needed, we just deleted it later in the video
  // useEffect(() => {
  //   setChannelName("");
  //   setDescription("");
  //   setChannelType("public");
  //   setError("");
  //   setSelectedMembers([]);
  // }, []);

  // For public channels: start with only the creator as a member.
  // Other users must join via the explicit join flow.
  useEffect(() => {
    setSelectedMembers([]);
  }, [channelType]);

  const validateChannelName = (name) => {
    if (!name.trim()) return "Channel name is required";
    if (name.length < 3) return "Channel name must be at least 3 characters";
    if (name.length > 22) return "Channel name must be less than 22 characters";

    return "";
  };

  const handleChannelNameChange = (e) => {
    const value = e.target.value;
    setChannelName(value);
    setError(validateChannelName(value));
  };

  const handleMemberToggle = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((uid) => uid !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const generateShareableLink = (channelId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/channel/${channelId}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateChannelName(channelName);
    if (validationError) return setError(validationError);

    if (isCreating || !client?.user) return;

    setIsCreating(true);
    setError("");

    try {
      // MY COOL CHANNEL !#1 => my-cool-channel-1
      const channelId = channelName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .slice(0, 20);

      // prepare the channel data

      const channelData = {
        name: channelName.trim(),
        created_by_id: client.user.id,
        created_by: {
          id: client.user.id,
          name: client.user.fullName || client.user.firstName || client.user.username || client.user.id,
          image: client.user.imageUrl
        },
        members: [client.user.id, ...selectedMembers],
      };

      if (description) channelData.description = description;

      if (channelType === "private") {
        channelData.private = true;
        channelData.visibility = "private";
      } else {
        channelData.visibility = "public";
        channelData.discoverable = true;
      }

      const channel = client.channel("messaging", channelId, channelData);

      await channel.create();
      await channel.watch();

      setActiveChannel(channel);
      setSearchParams({ channel: channelId });

      // Generate shareable link for public channels
      if (channelType === "public") {
        const link = generateShareableLink(channelId);
        setShareableLink(link);
        setCreatedChannelId(channelId);
      }

      toast.success(`Channel "${channelName}" created successfully!`);
      if (channelType !== "public") {
        onClose();
      }
    } catch (error) {
      console.log("Error creating the channel", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-channel-modal-overlay">
      <div className="create-channel-modal">
        <div className="create-channel-modal__header">
          <h2>{shareableLink ? "Share Public Channel" : "Create a channel"}</h2>
          <button onClick={onClose} className="create-channel-modal__close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {shareableLink ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HashIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Public Channel Created!</h3>
              <p className="text-gray-600 mb-4">Share this link to let people join your channel</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                />
                <button
                  onClick={() => copyToClipboard(shareableLink)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
                >
                  <CopyIcon className="w-4 h-4" />
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShareableLink("");
                  setCreatedChannelId("");
                  setChannelName("");
                  setDescription("");
                  setChannelType("public");
                  setSelectedMembers([]);
                  setError("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Create Another Channel
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="create-channel-modal__form">
          {error && (
            <div className="form-error">
              <AlertCircleIcon className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Channel name */}
          <div className="form-group">
            <div className="input-with-icon">
              <HashIcon className="w-4 h-4 input-icon" />
              <input
                id="channelName"
                type="text"
                value={channelName}
                onChange={handleChannelNameChange}
                placeholder="e.g. marketing"
                className={`form-input ${error ? "form-input--error" : ""}`}
                autoFocus
                maxLength={22}
              />
            </div>

            {/* channel id  preview */}
            {channelName && (
              <div className="form-hint">
                Channel ID will be: #
                {channelName
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-_]/g, "")}
              </div>
            )}
          </div>

          {/* CHANNEL TYPE */}
          <div className="form-group">
            <label>Channel type</label>

            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="public"
                  checked={channelType === "public"}
                  onChange={(e) => setChannelType(e.target.value)}
                />
                <div className="radio-content">
                  <HashIcon className="size-4" />
                  <div>
                    <div className="radio-title">Public</div>
                    <div className="radio-description">Anyone can join this channel</div>
                  </div>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  value="private"
                  checked={channelType === "private"}
                  onChange={(e) => setChannelType(e.target.value)}
                />
                <div className="radio-content">
                  <LockIcon className="size-4" />
                  <div>
                    <div className="radio-title">Private</div>
                    <div className="radio-description">Only invited members can join</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* add members component */}
          {channelType === "private" && (
            <div className="form-group">
              <label>Add members</label>
              <div className="member-selection-header">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setSelectedMembers(users.map((u) => u.id))}
                  disabled={loadingUsers || users.length === 0}
                >
                  <UsersIcon className="w-4 h-4" />
                  Select Everyone
                </button>
                <span className="selected-count">{selectedMembers.length} selected</span>
              </div>

              <div className="members-list">
                {loadingUsers ? (
                  <p>Loading users...</p>
                ) : users.length === 0 ? (
                  <p>No users found</p>
                ) : (
                  users.map((user) => (
                    <label key={user.id} className="member-item">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={() => handleMemberToggle(user.id)}
                        className="member-checkbox"
                      />
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || user.id}
                          className="member-avatar"
                        />
                      ) : (
                        <div className="member-avatar member-avatar-placeholder">
                          <span>{(user.name || user.id).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="member-name">{user.name || user.id}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="form-textarea"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="create-channel-modal__actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!channelName.trim() || isCreating}
              className="btn btn-primary"
            >
              {isCreating ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default CreateChannelModal;
