import type {GetQuestionsItemModel} from "@/generated/api.schemas.ts";
import Answers from "@/components/Answers.tsx";

interface QuestionProps {
    question: GetQuestionsItemModel;
    givenAnswer?: string;
    correctAnswer?: string;
    onAnswer: (answer: string) => void;
}

export default function Question({question, givenAnswer, correctAnswer, onAnswer}: QuestionProps) {
    let possible_answers = question.possible_answers ?? [];
    if (question.possible_answers?.every(a => a === "True" || a === "False")) {
        possible_answers = ["True", "False"]
    }

    return (
        <div className={"flex flex-col gap-2"}>
            <div dangerouslySetInnerHTML={{__html: question.question ?? ""}}
                 className={"bg-primary/10 p-2 rounded-sm wrap-anywhere"}/>
            <Answers answers={possible_answers} givenAnswer={givenAnswer}
                     correctAnswer={correctAnswer} onAnswer={onAnswer}/>
        </div>
    );
}
