import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as UserIcon,
  History as HistoryIcon,
  Lightbulb as SuggestIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Suggestion {
  id: number;
  text: string;
  category: string;
}

const sampleSuggestions: Suggestion[] = [
  {
    id: 1,
    text: 'How to improve lead conversion rates?',
    category: 'Sales',
  },
  {
    id: 2,
    text: 'Best practices for follow-up emails',
    category: 'Communication',
  },
  {
    id: 3,
    text: 'Analyze my recent campaign performance',
    category: 'Marketing',
  },
  {
    id: 4,
    text: 'Generate a property market report',
    category: 'Analysis',
  },
];

const sampleMessages: Message[] = [
  {
    id: 1,
    text: 'How can I improve my client engagement?',
    sender: 'user',
    timestamp: new Date('2024-03-15T10:30:00'),
  },
  {
    id: 2,
    text: 'Based on your client interaction data, here are some recommendations:\n\n1. Increase personalized communication frequency\n2. Implement a regular follow-up schedule\n3. Use multi-channel engagement (email, phone, SMS)\n4. Share relevant market insights\n5. Schedule quarterly review meetings',
    sender: 'ai',
    timestamp: new Date('2024-03-15T10:30:05'),
  },
];

const AskAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [inputText, setInputText] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: inputText,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInputText('');
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: messages.length + 2,
          text: 'Thank you for your question. I\'m analyzing the data to provide you with the best possible answer...',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon />
          Ask A.I
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Get instant answers, insights, and recommendations from your AI assistant.
        </Typography>

        {/* Quick Stats */}
        <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Questions Asked
              </Typography>
              <Typography variant="h4">
                {messages.filter(m => m.sender === 'user').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                AI Responses
              </Typography>
              <Typography variant="h4">
                {messages.filter(m => m.sender === 'ai').length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Saved Responses
              </Typography>
              <Typography variant="h4">
                0
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Suggestions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SuggestIcon />
            Suggested Questions
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {sampleSuggestions.map((suggestion) => (
              <Chip
                key={suggestion.id}
                label={suggestion.text}
                onClick={() => {
                  setInputText(suggestion.text);
                  setSelectedSuggestion(suggestion);
                }}
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>

        {/* Chat Interface */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 400, overflow: 'auto' }}>
          <List>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem alignItems="flex-start" sx={{ flexDirection: message.sender === 'user' ? 'row-reverse' : 'row' }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {message.sender === 'user' ? <UserIcon /> : <AIIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          backgroundColor: message.sender === 'user' ? 'primary.main' : 'grey.100',
                          color: message.sender === 'user' ? 'white' : 'text.primary',
                          p: 2,
                          borderRadius: 2,
                          display: 'inline-block',
                          maxWidth: '80%',
                        }}
                      >
                        {message.text}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: message.sender === 'user' ? 'right' : 'left' }}>
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < messages.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {/* Input Area */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            variant="outlined"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!inputText.trim()}
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* Recent History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          Recent Questions
        </Typography>
        <List>
          {messages.filter(m => m.sender === 'user').slice(-3).map((message) => (
            <React.Fragment key={message.id}>
              <ListItem>
                <ListItemIcon>
                  <UserIcon />
                </ListItemIcon>
                <ListItemText
                  primary={message.text}
                  secondary={message.timestamp.toLocaleDateString()}
                />
                <IconButton size="small">
                  <SaveIcon />
                </IconButton>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AskAI; 