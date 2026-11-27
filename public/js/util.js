export const ESC = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

export const esc = s =>
    String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export const day = n => {
    const d = new Date();

    d.setDate(d.getDate() + n);

    return new Date(
        d.getTime() - d.getTimezoneOffset() * 6e4
    ).toISOString().slice(0, 10);
};

export const FMT = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

export const fmt = s => FMT.format(new Date(s));

export const FMTD = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
});

export const fd = s => FMTD.format(new Date(s + 'T00:00'));
