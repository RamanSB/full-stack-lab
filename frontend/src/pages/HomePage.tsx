import { useNavigate } from "react-router-dom";

export default function HomePage() {
    const navigate = useNavigate();

    return (
        <section className="hero-card">


            <h1 className="hero-title">Backend Concepts</h1>

            <p className="hero-subtitle">
                Explore focused demos for streaming, async jobs, and backend architecture
                patterns through a simple interactive UI.
            </p>

            <div className="button-row">
                <button className="primary-button" onClick={() => navigate("/sse")}>
                    Server Sent Events
                </button>
            </div>
        </section>
    );
}