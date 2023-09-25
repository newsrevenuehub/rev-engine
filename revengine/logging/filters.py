import inspect
import logging


class ClassNameFilter(logging.Filter):
    def filter(self, record):
        classname = None
        frames = inspect.stack()
        for fr in frames:
            if fr.filename == record.pathname and fr.lineno == record.lineno:
                local_self = fr.frame.f_locals.get("self", None)
                if local_self:
                    classname = local_self.__class__.__name__
                break

        record.classname = ""
        if classname:
            record.classname = f"[{classname}] "
        return True
