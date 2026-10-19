export default function QuizScore(props: {
    score: { percentageCorrectlyAnswered: number },
    totals: { questions: number; answeredQuestions: number; correctlyAnsweredQuestions: number }
}) {
    return (
        <div className={"bg-primary/10 rounded-sm mt-4 p-2"}>
            <p>Score: <span className={"font-bold"}>{props.score.percentageCorrectlyAnswered.toFixed(0)}%</span></p>
            <p>Total questions: <span className={"font-bold"}>{props.totals.questions}</span></p>
            <p>Total answered questions: <span className={"font-bold"}>{props.totals.answeredQuestions}</span></p>
            <p>Total correctly answered questions: <span
                className={"font-bold"}>{props.totals.correctlyAnsweredQuestions}</span></p>
        </div>
    )
}