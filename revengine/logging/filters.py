import inspect
import logging


class ClassNameFilter(logging.Filter):
    def filter(self, record):
        frames = inspect.stack()
        classname = None
        record.classname = ""
        for fr in frames:  # pragma: no cover loop is never expected to complete
            if fr.filename == record.pathname and fr.lineno == record.lineno:
                local_vars = fr.frame.f_locals
                local_self = local_vars.get("self", None)
                local_cls = local_vars.get("cls", None)

                if local_self:
                    classname = local_self.__class__.__name__
                elif local_cls:
                    classname = local_cls.__name__

                if classname:
                    record.classname = f"[{classname}] "
                break
        return True
