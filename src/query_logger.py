"""Query event logging to JSONL"""

import json
from pathlib import Path
from datetime import datetime


class QueryLogger:
    def __init__(self):
        self.log_file = Path(__file__).parent.parent / "logs" / "queries.jsonl"
        self.log_file.parent.mkdir(exist_ok=True)

    def _write(self, event: dict):
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
        except Exception:
            pass

    def log_query(self, query_id: str = "", **kwargs):
        self._write({"ts": datetime.now().isoformat(), "event": "query",
                     "query_id": query_id, **{k: v for k, v in kwargs.items()
                                              if isinstance(v, (str, int, float, bool, type(None)))}})

    def log_filter_decision(self, query_id: str = "", *args, **kwargs):
        self._write({"ts": datetime.now().isoformat(), "event": "filter",
                     "query_id": query_id,
                     "is_relevant": kwargs.get("is_relevant", kwargs.get("is_tax_related")),
                     "score": kwargs.get("score", kwargs.get("relevance_score", 0.0)),
                     "reason": kwargs.get("reason", "")})

    def log_retrieval(self, query_id: str = "", **kwargs):
        chunks = kwargs.get("chunks", kwargs.get("retrieved_chunks", []))
        self._write({"ts": datetime.now().isoformat(), "event": "retrieval",
                     "query_id": query_id, "num_chunks": len(chunks) if chunks else 0,
                     "retrieval_time_ms": kwargs.get("retrieval_time_ms", 0)})

    def log_generation(self, query_id: str = "", **kwargs):
        answer = kwargs.get("answer", "")
        self._write({"ts": datetime.now().isoformat(), "event": "generation",
                     "query_id": query_id, "answer_length": len(answer) if answer else 0,
                     "generation_time_ms": kwargs.get("generation_time_ms", 0),
                     "model": kwargs.get("model", "")})

    def log_feature_output(self, query_id: str = "", **kwargs):
        self._write({"ts": datetime.now().isoformat(), "event": "feature",
                     "query_id": query_id, "feature": kwargs.get("feature", ""),
                     "success": kwargs.get("success", True),
                     "processing_time_ms": kwargs.get("processing_time_ms", 0)})

    def log_error(self, query_id: str = "", *args, **kwargs):
        self._write({"ts": datetime.now().isoformat(), "event": "error",
                     "query_id": query_id, "feature": kwargs.get("feature", ""),
                     "error_type": kwargs.get("error_type", ""),
                     "error_message": kwargs.get("error_message", str(args[0]) if args else "")})


def get_query_logger() -> QueryLogger:
    return QueryLogger()
