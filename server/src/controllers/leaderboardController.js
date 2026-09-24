import Workshop from '../models/Workshop.js';
import Registration from '../models/Registration.js';
import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';
import { Assignment, AssignmentScore } from '../models/Assignment.js';

// Get leaderboard for a workshop
export async function getLeaderboard(req, res) {
  try {
    const { workshopId } = req.params;
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    // Get all registrations
    const registrations = await Registration.find({
      workshop: workshopId,
      status: 'confirmed',
    }).select('user');

    const userIds = registrations.map((r) => r.user);

    // Calculate attendance percentage for each user
    const totalSessions = await Session.countDocuments({ workshop: workshopId });

    const leaderboard = [];

    for (const userId of userIds) {
      const presentCount = await Attendance.countDocuments({
        workshop: workshopId,
        user: userId,
        status: 'present',
      });

      const attendancePercent = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

      // Calculate average task score
      const assignments = await Assignment.find({ workshop: workshopId });
      let totalScore = 0;
      let maxTotal = 0;

      for (const assignment of assignments) {
        const score = await AssignmentScore.findOne({
          assignment: assignment._id,
          user: userId,
        });
        if (score) {
          totalScore += score.score;
          maxTotal += assignment.maxScore;
        }
      }

      const avgTaskScore = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;

      // Composite score: 60% attendance + 40% task score
      const compositeScore = (0.6 * attendancePercent) + (0.4 * avgTaskScore);

      leaderboard.push({
        userId,
        attendancePercent: Math.round(attendancePercent),
        avgTaskScore: Math.round(avgTaskScore),
        compositeScore: Math.round(compositeScore * 100) / 100,
      });
    }

    // Sort by composite score descending and take top 10
    leaderboard.sort((a, b) => b.compositeScore - a.compositeScore);
    const top10 = leaderboard.slice(0, 10);

    // Populate user names
    const User = (await import('../models/User.js')).default;
    const populated = await Promise.all(
      top10.map(async (entry) => {
        const user = await User.findById(entry.userId).select('name');
        return {
          ...entry,
          userName: user?.name || 'Unknown',
        };
      }),
    );

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
