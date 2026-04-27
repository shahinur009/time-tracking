function RenderMessage({ message }) {
    if (!message) return null;
    if (Array.isArray(message)) {
        return (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
                {message.map((m, i) => (
                    <li key={i}>{String(m)}</li>
                ))}
            </ul>
        );
    }
    return <span>{String(message)}</span>;
}

export default RenderMessage;
