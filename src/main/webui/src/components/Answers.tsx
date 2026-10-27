import {Button, buttonVariants} from "@/components/ui/button.tsx";
import type {VariantProps} from "class-variance-authority";

interface AnswersProps {
    answers: string[];
    givenAnswer?: string;
    correctAnswer?: string;
    onAnswer: (answer: string) => void;
}

export default function Answers({answers, givenAnswer, correctAnswer, onAnswer}: AnswersProps) {
    return (
        <div className={"flex flex-wrap gap-2"}>
            {answers.map((answer, index) => {
                const isGivenAnswer = givenAnswer === answer;
                const isCorrectAnswer = correctAnswer === answer;

                let variantProps: VariantProps<typeof buttonVariants> = {
                    variant: isCorrectAnswer ? "confirmative" : isGivenAnswer ? "default" : "outline",
                    size: "lg"
                }
                return (
                    <Button key={index} {...variantProps}
                            onClick={() => onAnswer(answer)}
                            disabled={correctAnswer !== undefined}
                            className={"h-auto min-h-8 max-w-full whitespace-normal wrap-anywhere py-4 text-center"}
                            dangerouslySetInnerHTML={{__html: answer ?? ""}}/>
                );
            })}
        </div>
    );
}
