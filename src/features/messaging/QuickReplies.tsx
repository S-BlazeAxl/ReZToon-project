interface Props {
  replies: string[];
  onPick: (reply: string) => void;
}

export default function QuickReplies({ replies, onPick }: Props) {
  if (replies.length === 0) return null;
  return (
    <div className="message-quick-replies">
      {replies.map((r) => (
        <button key={r} type="button" onClick={() => onPick(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}