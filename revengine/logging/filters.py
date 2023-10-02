import inspect
import logging


class ClassNameFilter(logging.Filter):
    def filter(self, record):
        frames = inspect.stack()
        record.classname = ""
        for fr in frames:  # pragma: no cover loop is never expected to complete
            if fr.filename == record.pathname and fr.lineno == record.lineno:
                local_self = fr.frame.f_locals.get("self", None)
                if local_self:
                    record.classname = f"[{local_self.__class__.__name__}]"
                break
        return True
