import {useEffect, useRef, useState} from "react";
import {errorMessage, requireSuccess} from '@/lib/apiErrors';
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
    const [error, setError] = useState<string | null>(null);
    const submissionVersion = useRef(0);
    const submitting = useRef(false);

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
        submissionVersion.current += 1;
        setError(null);
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
        if (submitting.current || answerEntries.length === 0) return;
        submitting.current = true;
        const version = submissionVersion.current;
        setError(null);
        try {
            const response = await checkAnswersMutation.mutateAsync({data: {question_ids: Object.keys(givenAnswers)}});
            const data = requireSuccess(response);
            if (!data || !Array.isArray(data.answers) || data.answers.length !== answerEntries.length
                || data.answers.some(a => !a.id || !(a.id in givenAnswers) || typeof a.correct_answer !== 'string')) {
                throw new Error('Invalid answers response');
            }
            if (version === submissionVersion.current) {
                setCorrectAnswers(Object.fromEntries(data.answers.map(a => [a.id!, a.correct_answer!])));
            }
        } catch (error) {
            if (version === submissionVersion.current) {
                setError(errorMessage(error, 'Unable to submit answers. Please try again.'));
            }
        } finally {
            submitting.current = false;
        }
    };

    const selectAnswer = (questionId: string, answer: string) => {
        if (submitting.current) return;
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
        error,
        isSubmitting: checkAnswersMutation.isPending,
        isSubmitDisabled: checkAnswersMutation.isPending || answerEntries.length === 0 || correctAnswerEntries.length >= (questions?.length ?? 10),
        selectAnswer,
        submit,
        reset: resetState,
    };
}
