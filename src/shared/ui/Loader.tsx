interface LoaderProps {
    hidden: boolean;
}

export default function Loader({ hidden }: LoaderProps) {
    return (
        <div className={`loader ${hidden ? 'hidden' : ''}`} id="loader">
            <div className="loader-ring" />
            <div className="loader-ring-inner" />
            <span>ReZToon</span>
            <div className="loader-dots">
                <span />
                <span />
                <span />
            </div>
        </div>
    );
}