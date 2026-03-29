import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, XIcon, SendIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const ReplyBox = ({ message, onClose, onSendReply }) => {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textAreaRef = useRef(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      await onSendReply(message.id, text);
      // onSendReply closes the box on success; show toast here
      toast.success('Reply sent');
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3 rounded-lg">
      {/* Quoted message preview */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 border-l-2 border-blue-400 pl-2">
        <ArrowLeftIcon className="w-3 h-3 flex-shrink-0" />
        <span className="font-medium text-gray-700">
          {message.user?.name || message.user?.id}:
        </span>
        <span className="truncate max-w-xs">{message.text}</span>
        <button
          onClick={onClose}
          className="ml-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Close reply"
        >
          <XIcon className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textAreaRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a reply… (Enter to send)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
          rows={2}
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          disabled={!replyText.trim() || isSending}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 flex-shrink-0"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ReplyBox;
