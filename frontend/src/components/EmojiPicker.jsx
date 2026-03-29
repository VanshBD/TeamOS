import { useState, useRef, useEffect } from 'react';
import { SmileIcon, XIcon } from 'lucide-react';

const EmojiPicker = ({ onSelect, onClose, position }) => {
  const pickerRef = useRef(null);
  
  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '🤝', '🙏'
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={pickerRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 grid grid-cols-8 gap-1 max-w-sm animate-scale-in"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="absolute top-0 right-0 p-1">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
        >
          <XIcon className="w-3 h-3" />
        </button>
      </div>
      {emojis.map((emoji, index) => (
        <button
          key={index}
          onClick={() => onSelect(emoji)}
          className="hover:bg-gray-100 rounded p-1 text-lg transition-colors flex items-center justify-center"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
