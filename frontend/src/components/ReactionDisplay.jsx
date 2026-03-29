import { useState } from 'react';
import { SmileIcon } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const ReactionDisplay = ({ reactions, onAddReaction, message }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const handleReactionClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerPosition({
      top: rect.top - 10,
      left: rect.left + rect.width / 2
    });
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji) => {
    onAddReaction(message.id, emoji);
    setShowEmojiPicker(false);
  };

  if (!reactions || reactions.length === 0) {
    return (
      <button
        onClick={handleReactionClick}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-all"
        title="Add reaction"
      >
        <SmileIcon className="w-3 h-3" />
        <span>React</span>
      </button>
    );
  }

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const emoji = reaction.type;
    if (!acc[emoji]) {
      acc[emoji] = {
        count: 0,
        users: []
      };
    }
    acc[emoji].count++;
    acc[emoji].users.push(reaction.user);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => onAddReaction(message.id, emoji)}
          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full transition-colors border border-gray-200"
          title={`${data.count} user${data.count > 1 ? 's' : ''}: ${data.users.map(u => u.name || u.id).join(', ')}`}
        >
          <span>{emoji}</span>
          <span className="text-gray-600 font-medium">{data.count}</span>
        </button>
      ))}
      
      <button
        onClick={handleReactionClick}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-all"
        title="Add reaction"
      >
        <SmileIcon className="w-3 h-3" />
      </button>

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          position={pickerPosition}
        />
      )}
    </div>
  );
};

export default ReactionDisplay;
