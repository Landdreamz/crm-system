import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  PlayCircleOutline,
  Description,
  Book,
  School,
  Assignment,
  Star,
} from '@mui/icons-material';

interface TrainingResource {
  id: number;
  title: string;
  type: 'video' | 'document' | 'course' | 'quiz';
  description: string;
  duration?: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
}

const sampleResources: TrainingResource[] = [
  {
    id: 1,
    title: 'CRM Basics for New Users',
    type: 'video',
    description: 'Learn the fundamental concepts and features of our CRM system.',
    duration: '15 mins',
    level: 'Beginner',
    category: 'Getting Started',
  },
  {
    id: 2,
    title: 'Advanced Lead Management',
    type: 'course',
    description: 'Master the art of managing and nurturing leads effectively.',
    duration: '2 hours',
    level: 'Advanced',
    category: 'Sales',
  },
  {
    id: 3,
    title: 'Best Practices Guide',
    type: 'document',
    description: 'Comprehensive guide on CRM best practices and workflows.',
    level: 'Intermediate',
    category: 'Documentation',
  },
  {
    id: 4,
    title: 'Sales Pipeline Mastery',
    type: 'quiz',
    description: 'Test your knowledge of sales pipeline management.',
    duration: '30 mins',
    level: 'Advanced',
    category: 'Sales',
  },
];

const getResourceIcon = (type: TrainingResource['type']) => {
  switch (type) {
    case 'video':
      return <PlayCircleOutline />;
    case 'document':
      return <Description />;
    case 'course':
      return <School />;
    case 'quiz':
      return <Assignment />;
    default:
      return <Book />;
  }
};

const getLevelColor = (level: TrainingResource['level']) => {
  switch (level) {
    case 'Beginner':
      return 'success';
    case 'Intermediate':
      return 'warning';
    case 'Advanced':
      return 'error';
    default:
      return 'default';
  }
};

const TrainingResources: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const categories = Array.from(new Set(sampleResources.map(resource => resource.category)));
  const filteredResources = selectedCategory
    ? sampleResources.filter(resource => resource.category === selectedCategory)
    : sampleResources;

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School />
          Training & Resources
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Access training materials, documentation, and resources to help you master the CRM system.
        </Typography>

        {/* Categories */}
        <Box sx={{ mb: 4, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? 'filled' : 'outlined'}
            color={selectedCategory === null ? 'primary' : 'default'}
          />
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              color={selectedCategory === category ? 'primary' : 'default'}
            />
          ))}
        </Box>

        {/* Resources Grid */}
        <Stack direction="row" flexWrap="wrap" gap={3}>
          {filteredResources.map((resource) => (
            <Box key={resource.id} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                      {getResourceIcon(resource.type)}
                    </ListItemIcon>
                    <Typography variant="h6" component="div">
                      {resource.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {resource.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={resource.level}
                      size="small"
                      color={getLevelColor(resource.level) as any}
                    />
                    {resource.duration && (
                      <Chip
                        label={resource.duration}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Chip
                      label={resource.type}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button variant="contained" fullWidth>
                    Access Resource
                  </Button>
                </Box>
              </Card>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Featured Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Star />
          Featured Resources
        </Typography>
        <List>
          {sampleResources.slice(0, 3).map((resource) => (
            <React.Fragment key={resource.id}>
              <ListItem>
                <ListItemIcon>
                  {getResourceIcon(resource.type)}
                </ListItemIcon>
                <ListItemText
                  primary={resource.title}
                  secondary={resource.description}
                />
                <Button variant="outlined" size="small">
                  View
                </Button>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default TrainingResources; 