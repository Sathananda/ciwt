export const CATS = [
    'Electrical',
    'Plumbing',
    'Furniture',
    'Cleaning',
    'Network',
    'Others'
];

export const PRI = [
    'Low',
    'Medium',
    'High',
    'Critical'
];

export const ST = {
    OPEN: 'Open',
    IN_PROGRESS: 'In-Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed'
};

export const CT = s => s[0] + s.slice(1).toLowerCase();
