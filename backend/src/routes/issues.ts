import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';

const router = express.Router();

interface IssueReportData {
  title: string;
  description: string;
  category: 'bug' | 'feature' | 'ui' | 'performance' | 'security' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// GitHub API response interface
interface GitHubIssueResponse {
  html_url: string;
  number: number;
  [key: string]: any; // Allow other properties
}

// Helper function to create GitHub issue
async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[]
): Promise<{ url: string; number: number } | null> {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubUser = process.env.GITHUB_USER;
  const githubRepo = process.env.GITHUB_REPO; // Format: owner/repo

  if (!githubToken || !githubUser || !githubRepo) {
    return null; // GitHub integration not configured
  }

  try {
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      console.error('Invalid GITHUB_REPO format. Expected: owner/repo');
      return null;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': githubUser,
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return null;
    }

    const issue = await response.json() as GitHubIssueResponse;
    return {
      url: issue.html_url,
      number: issue.number,
    };
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    return null;
  }
}

// Helper function to determine labels based on category and priority
function getIssueLabels(
  category: string,
  priority: string
): string[] {
  const labels: string[] = [];

  // Category labels
  switch (category) {
    case 'bug':
      labels.push('bug');
      break;
    case 'feature':
      labels.push('enhancement', 'feature-request');
      break;
    case 'ui':
      labels.push('ui', 'ux');
      break;
    case 'performance':
      labels.push('performance');
      break;
    case 'security':
      labels.push('security');
      break;
    case 'other':
      labels.push('question');
      break;
  }

  // Priority labels
  switch (priority) {
    case 'critical':
      labels.push('priority: critical');
      break;
    case 'high':
      labels.push('priority: high');
      break;
    case 'medium':
      labels.push('priority: medium');
      break;
    case 'low':
      labels.push('priority: low');
      break;
  }

  // Add user-reported label
  labels.push('user-reported');

  return labels;
}

// POST /api/issues/report - Report an issue
router.post('/report', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, description, category, priority }: IssueReportData = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!category || !['bug', 'feature', 'ui', 'performance', 'security', 'other'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (!priority || !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    // Get user information for the issue body
    const user = await UserModel.findById(userId);
    const username = user?.username || 'Unknown User';
    const userEmail = user?.email || 'N/A';

    // Format issue body with user information
    const issueBody = `## Description
${description}

## Reported By
- **User**: ${username}
- **Email**: ${userEmail}
- **User ID**: ${userId}

## Details
- **Category**: ${category}
- **Priority**: ${priority}
- **Reported At**: ${new Date().toISOString()}

---
*This issue was automatically created from the application's issue reporting system.*`;

    // Get labels for GitHub
    const labels = getIssueLabels(category, priority);

    // Try to create GitHub issue
    let githubIssue = null;
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_USER && process.env.GITHUB_REPO) {
      githubIssue = await createGitHubIssue(title.trim(), issueBody, labels);
    }

    // Log the issue (you could also store it in a database)
    console.log('Issue reported:', {
      userId,
      username,
      title: title.trim(),
      category,
      priority,
      githubIssue: githubIssue ? `#${githubIssue.number}` : 'Not created (GitHub not configured)',
    });

    // Return success response
    res.json({
      success: true,
      issue_id: githubIssue?.number || null,
      github_issue_url: githubIssue?.url || null,
      message: githubIssue
        ? `Issue created successfully! View it on GitHub: ${githubIssue.url}`
        : 'Issue reported successfully. GitHub integration is not configured, but your report has been logged.',
    });
  } catch (error: any) {
    console.error('Report issue error:', error);
    res.status(500).json({ error: error.message || 'Failed to report issue' });
  }
});

export default router;
