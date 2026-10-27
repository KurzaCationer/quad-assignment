import {useEffect, useState} from "react";
import {usePostApiCheckAnswers} from "@/generated/check-answers-endpoint/check-answers-endpoint";
import type {GetQuestionsItemModel} from "@/generated/api.schemas.ts";

interface UseQuizAnswersOptions {
    questions: GetQuestionsItemModel[] | undefined;
    fetchedAt: number;
}

export function useQuizAnswers({questions, fetchedAt: fetchedAtLoader}: UseQuizAnswersOptions) {
    const [fetchedAt, setFetchedAt] = useState(fetchedAtLoader);
    const [givenAnswers, setGivenAnswers] = useState<{ [id: string]: string }>({});
    const [correctAnswers, setCorrectAnswers] = useState<{ [id: string]: string }>({});

    const answerEntries = Object.entries(givenAnswers);
    const correctAnswerEntries = Object.entries(correctAnswers);

    const totals = {
        questions: questions?.length ?? 0,
        answeredQuestions: Object.keys(correctAnswers).length,
        correctlyAnsweredQuestions: correctAnswerEntries.filter(ca => answerEntries.some(a => {
            return ca[0] === a[0] && ca[1] === a[1];
        })).length
    };

    const score = totals.answeredQuestions > 0 ? {
        percentageCorrectlyAnswered: totals.correctlyAnsweredQuestions / totals.answeredQuestions * 100
    } : null;

    const checkAnswersMutation = usePostApiCheckAnswers({});

    const resetState = () => {
        setGivenAnswers({});
        setCorrectAnswers({});
    };

    //Reset state when route loader updates the questions
    useEffect(() => {
        if (fetchedAt !== fetchedAtLoader) {
            resetState();
            setFetchedAt(fetchedAtLoader)
        }
    }, [fetchedAt, fetchedAtLoader]);

    const submit = async () => {
        const response = await checkAnswersMutation.mutateAsync({data: {question_ids: Object.keys(givenAnswers)}});

        let newAnswers = {};
        newAnswers = response?.data!.answers?.filter(a => a.id !== undefined).reduce((prev, current) => ({
            ...prev,
            [current.id!]: current.correct_answer
        }), newAnswers) ?? {};
        setCorrectAnswers(newAnswers);
    };

    const selectAnswer = (questionId: string, answer: string) => {
        setGivenAnswers((oldAnswers) => ({
            ...oldAnswers,
            [questionId]: answer
        }));
    };

    return {
        given: givenAnswers,
        correct: correctAnswers,
        totals,
        score,
        isSubmitting: checkAnswersMutation.isPending,
        isSubmitDisabled: checkAnswersMutation.isPending || correctAnswerEntries.length >= (questions?.length ?? 10),
        selectAnswer,
        submit,
        reset: resetState,
    };
}
