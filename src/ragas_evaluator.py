"""Quality evaluation using RAGAS metrics (placeholder)"""


class RagasEvaluator:
    def evaluate_response(self, query_id: str, question: str, answer: str,
                          context: str, **kwargs) -> dict:
        return {
            "score": 0.8,
            "metrics": {
                "relevance": 0.85,
                "completeness": 0.75,
                "accuracy": 0.80
            }
        }


def get_ragas_evaluator() -> RagasEvaluator:
    return RagasEvaluator()
