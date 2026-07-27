import MUITooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import { isEqual } from 'lodash';
import { useEffect, useRef, useState, memo, useCallback, isValidElement, cloneElement } from 'react';

const mergeRefs = (...refs) => (node) => {
  refs.forEach((ref) => {
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref != null) {
      ref.current = node;
    }
  });
};

const Tooltip = ({
  children,
  tooltipActive = true,
  displayTooltipOnOverflow = false,
  triggerResizeProps = [],
  disableHover = false,
  disablePortal = false,
  maxWidth = '642px',
  title,
  open,
  styles = {},
  ...props
}) => {
  const [disableHoverListener, setDisableHoverListener] = useState(
    displayTooltipOnOverflow ? true : disableHover
  );
  const observerRef = useRef(null);

  const overflowRefCallback = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!displayTooltipOnOverflow || !node) return;

    const checkOverflow = () => {
      const hasOverflow =
        node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight;
      setDisableHoverListener(!hasOverflow);
    };

    observerRef.current = new ResizeObserver(checkOverflow);
    observerRef.current.observe(node);
    checkOverflow();
  }, [displayTooltipOnOverflow]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const childWithRef = displayTooltipOnOverflow && isValidElement(children)
    ? cloneElement(children, {
        ref: mergeRefs(overflowRefCallback, children.ref),
      })
    : children;

  if (!tooltipActive) {
    return childWithRef;
  }

  return (
    <MUITooltip
      {...(typeof open !== 'undefined' && { open })}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 180 }}
      disableHoverListener={disableHoverListener}
      slotProps={{
        tooltip: {
          style: {
            fontFamily: "'Poppins', sans-serif",
            padding: '4px 12px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #EEF0F7',
            background: '#424766',
            boxShadow: '0px 12px 12px 0px rgba(177, 177, 177, 0.10)',
            margin: '4px',
            maxWidth,
            ...(styles?.tooltip && { ...styles.tooltip }),
          },
        },
        arrow: {
          sx: {
            color: '#424766',
            ...(styles?.arrow && { ...styles.arrow }),
          },
        },
        popper: {
          disablePortal,
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 6],
              },
            },
          ],
        },
      }}
      {...(!disableHoverListener && { title })}
      {...props}
    >
      {childWithRef}
    </MUITooltip>
  );
};

const areEqual = (prevProps, nextProps) => {
  const deepEqualProps =
    isEqual(prevProps.children, nextProps.children) &&
    isEqual(prevProps.triggerResizeProps, nextProps.triggerResizeProps) &&
    isEqual(prevProps.styles, nextProps.styles);

  const shallowEqualProps =
    prevProps.tooltipActive === nextProps.tooltipActive &&
    prevProps.displayTooltipOnOverflow === nextProps.displayTooltipOnOverflow &&
    prevProps.disableHover === nextProps.disableHover &&
    prevProps.disablePortal === nextProps.disablePortal &&
    prevProps.maxWidth === nextProps.maxWidth &&
    prevProps.open === nextProps.open &&
    prevProps.title === nextProps.title &&
    prevProps.placement === nextProps.placement;

  return deepEqualProps && shallowEqualProps;
};

export default memo(Tooltip, areEqual);
