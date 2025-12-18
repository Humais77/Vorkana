import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  File,
  Smile,
  Mic,
  Check,
  CheckCheck,
  Clock,
  User,
  MoreVertical,
  Archive,
  Bell,
  BellOff,
  Trash2,
  Flag,
  Download
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { messagingAPI } from '../api/messaging';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const MessagingModal = ({ 
  isOpen, 
  onClose, 
  receiver, 
  gig,
  initialConversation = null 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(initialConversation);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { user } = useAuthStore();
  const { 
    socket, 
    isConnected, 
    joinConversation, 
    leaveConversation, 
    sendMessage, 
    startTyping, 
    stopTyping,
    markAsRead 
  } = useSocket();

  // Initialize conversation
  useEffect(() => {
    if (isOpen && receiver?._id && !conversation) {
      initializeConversation();
    }
  }, [isOpen, receiver, conversation]);

  // Join conversation room
  useEffect(() => {
    if (conversation?._id && isConnected) {
      joinConversation(conversation._id);
      
      // Set up socket listeners
      socket.on('receive_message', handleNewMessage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stopped_typing', handleUserStoppedTyping);
      socket.on('messages_read', handleMessagesRead);
      socket.on('new_message_notification', handleNewNotification);
      
      // Load messages
      loadMessages();
      
      // Mark existing messages as read
      markUnreadMessages();
    }

    return () => {
      if (conversation?._id) {
        leaveConversation(conversation._id);
        socket?.off('receive_message', handleNewMessage);
        socket?.off('user_typing', handleUserTyping);
        socket?.off('user_stopped_typing', handleUserStoppedTyping);
        socket?.off('messages_read', handleMessagesRead);
        socket?.off('new_message_notification', handleNewNotification);
      }
    };
  }, [conversation, isConnected]);

  // Scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      const response = await messagingAPI.startConversation(receiver._id, gig?._id);
      setConversation(response.conversation);
      setMessages(response.messages || []);
    } catch (error) {
      toast.error('Failed to start conversation');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!conversation) return;
    
    try {
      const response = await messagingAPI.getMessages(conversation._id);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markUnreadMessages = () => {
    const unreadMessageIds = messages
      .filter(msg => 
        msg.receiver === user._id && 
        !msg.read
      )
      .map(msg => msg._id);

    if (unreadMessageIds.length > 0) {
      markAsRead(conversation._id, unreadMessageIds);
    }
  };

  const handleNewMessage = (data) => {
    if (data.success && data.message) {
      setMessages(prev => [...prev, data.message]);
      
      // Mark as read if it's for current user
      if (data.message.receiver === user._id) {
        markAsRead(conversation._id, [data.message._id]);
      }
    }
  };

  const handleUserTyping = (data) => {
    if (data.userId !== user._id) {
      setIsTyping(true);
      setTypingUser(data);
    }
  };

  const handleUserStoppedTyping = (data) => {
    if (data.userId !== user._id) {
      setIsTyping(false);
      setTypingUser(null);
    }
  };

  const handleMessagesRead = (data) => {
    setMessages(prev => 
      prev.map(msg => 
        data.messageIds.includes(msg._id) 
          ? { ...msg, read: true, readAt: new Date() }
          : msg
      )
    );
  };

  const handleNewNotification = (data) => {
    // Handle desktop notifications
    if (Notification.permission === 'granted' && data.sender._id !== user._id) {
      new Notification(`New message from ${data.sender.name}`, {
        body: data.message,
        icon: data.sender.picture,
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;

    try {
      const messageData = {
        conversationId: conversation._id,
        message: newMessage.trim(),
        gigId: gig?._id,
        receiverId: receiver._id,
      };

      // Handle file uploads if any
      if (attachments.length > 0) {
        // Upload attachments and add to messageData
        const uploadPromises = attachments.map(file => 
          messagingAPI.uploadAttachment(file)
        );
        const uploadResults = await Promise.all(uploadPromises);
        messageData.attachments = uploadResults.map(res => res.filePath);
      }

      await sendMessage(messageData);
      
      // Clear input and attachments
      setNewMessage('');
      setAttachments([]);
      stopTyping(conversation._id);
      
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping && conversation?._id) {
      startTyping(conversation._id);
      setIsTyping(true);
    }
  };

  const handleStopTyping = () => {
    if (isTyping && conversation?._id) {
      stopTyping(conversation._id);
      setIsTyping(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return messageDate.toLocaleDateString();
  };

  const renderMessageStatus = (message) => {
    if (message.sender._id !== user._id) return null;
    
    if (!message.read) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    
    if (message.read && !message.readAt) {
      return <Check className="h-3 w-3 text-gray-400" />;
    }
    
    return <CheckCheck className="h-3 w-3 text-green-500" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={receiver?.picture || `https://ui-avatars.com/api/?name=${receiver?.name}&background=random`}
                  alt={receiver?.name}
                  className="h-10 w-10 rounded-full"
                />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{receiver?.name}</h3>
                <p className="text-sm text-gray-500">
                  {isTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.open(`/profile/${receiver?._id}`, '_blank')}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="View Profile"
              >
                <User className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {gig && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{gig.title}</h4>
                  <p className="text-xs text-gray-500">Project Budget: ${gig.budget}</p>
                </div>
                <a
                  href={`/gig/${gig._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Gig
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div className="h-[calc(100vh-200px)] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500 max-w-sm">
                Send your first message to {receiver?.name} about {gig?.title || 'the project'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => {
                const isCurrentUser = message.sender._id === user._id;
                const showDate = index === 0 || 
                  formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);
                
                return (
                  <React.Fragment key={message._id}>
                    {showDate && (
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2 ${
                        isCurrentUser 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-gray-100 text-gray-900 rounded-tl-none'
                      }`}>
                        {!isCurrentUser && (
                          <p className="text-xs font-medium mb-1">{message.sender.name}</p>
                        )}
                        
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment, idx) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
                              const fileName = attachment.split('/').pop();
                              
                              return (
                                <div key={idx} className={`p-2 rounded-lg ${
                                  isCurrentUser ? 'bg-blue-700' : 'bg-gray-200'
                                }`}>
                                  {isImage ? (
                                    <a 
                                      href={attachment} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img 
                                        src={attachment} 
                                        alt={fileName} 
                                        className="max-h-48 rounded-lg object-cover w-full"
                                      />
                                    </a>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <File className="h-4 w-4" />
                                      <a 
                                        href={attachment} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm truncate hover:underline"
                                      >
                                        {fileName}
                                      </a>
                                      <button
                                        onClick={() => window.open(attachment, '_blank')}
                                        className="p-1 hover:opacity-80"
                                        title="Download"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        <div className={`flex items-center justify-end mt-1 space-x-2 text-xs ${
                          isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          <span>{formatTime(message.createdAt)}</span>
                          {isCurrentUser && renderMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              
              {isTyping && typingUser && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-none px-4 py-2">
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <div className="flex items-center space-x-2 overflow-x-auto">
              {attachments.map((file, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <div className="h-16 w-16 bg-white border rounded-lg overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-100">
                        <File className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-xs text-gray-500 truncate mt-1 max-w-16">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={handleStopTyping}
                placeholder={`Message ${receiver?.name}...`}
                className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={!isConnected}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.zip,.rar"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Attach file"
                disabled={!isConnected}
              >
                <Paperclip className="h-5 w-5 text-gray-600" />
              </button>
              
              <button
                type="submit"
                disabled={(!newMessage.trim() && attachments.length === 0) || !isConnected}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <div>
              {!isConnected && (
                <span className="text-red-500">Connecting...</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span>Press Enter to send</span>
              <span>Shift+Enter for new line</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessagingModal;