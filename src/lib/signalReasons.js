export function formatTrendingReason(reason) {
  if (!reason) return '';

  if (
    reason.signal_type === 'repo_traction' &&
    reason.numeric_value &&
    reason.numeric_unit === 'stars'
  ) {
    return `GitHub stars +${reason.numeric_value}`;
  }

  if (reason.signal_type === 'ranking_momentum') {
    return 'Ranking momentum increased';
  }

  if (reason.signal_type === 'attention_spike') {
    return 'Audience attention increased';
  }

  if (reason.signal_type === 'launch_attention') {
    return 'Launch attention increased';
  }

  if (reason.signal_type === 'ecosystem_collaboration') {
    return 'Collaboration signal detected';
  }

  if (reason.signal_type === 'daily_momentum') {
    return 'Short-term momentum increased';
  }

  if (reason.signal_type === 'timeline_attention') {
    return 'Timeline attention increased';
  }

  return reason.title || 'Ecosystem signal';
}

export function getTopTrendingReason(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) return null;
  return reasons[0];
}
