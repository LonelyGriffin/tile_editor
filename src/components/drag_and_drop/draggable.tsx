import React, {
    Component,
    MouseEventHandler,
    RefObject,
} from "react";
import {DraggableType} from "./draggable_type";
import styles from "./draggable.module.css";
import {DroppableType} from "./droppable_type";
import {DragAndDropConsumer, IDragAndDropContextValue, IDraggableEntity} from "./drag_and_drop_context";
import {IVector, makeVector, vectorSub, vectorSum, vectorX, vectorY} from "../../core/vector";
import {makeRectByBoundary, rectangleTL} from "../../core/rectangle";

export interface IDraggingState {
    hasDragging: boolean;
}

interface IProps {
    type: DraggableType;
    children: (handleStartDrag: MouseEventHandler<any>, draggingState: IDraggingState) => JSX.Element;
    relevantDroppableTypes: ReadonlyArray<DroppableType>;
    onDrop?: (draggingState: IDraggingState) => void;
    onDrag?: (draggingState: IDraggingState) => void;
    lock?: boolean;
}

interface IState {
    hasDragging: boolean;
    position: IVector;
}

type IDraggableComponentProps = IProps & IDragAndDropContextValue;

export class DraggableComponent extends Component<IDraggableComponentProps, IState> {
    private draggableContainerRef: RefObject<HTMLDivElement> = React.createRef();
    constructor(props: IDraggableComponentProps) {
        super(props);

        this.state = {
            hasDragging: false,
            position: makeVector(0, 0),
        }
    }

    public componentWillUnmount() {
        this.props.resetDraggableGetter();
    }

    private entityGetter = (): IDraggableEntity => ({
        ref: this.draggableContainerRef,
        type: this.props.type,
        relevantDroppableTypes: this.props.relevantDroppableTypes,
    });

    private handleStartDrag = (mouseEvent: React.MouseEvent<Element>) => {
        if (!this.props.lock) {
            return;
        }

        mouseEvent.preventDefault();

        const startRectangle = makeRectByBoundary(mouseEvent.currentTarget.getBoundingClientRect());
        const startMousePosition = makeVector(mouseEvent.pageX, mouseEvent.pageY);
        const startRectangleTL = rectangleTL(startRectangle);
        const rectangleFromMousePositionOffset = vectorSub(startMousePosition, startRectangleTL);

        const handleDrag: EventListener = (e: any) => {
            const newMousePosition = makeVector(e.pageX, e.pageY);
            const newRectangleTL = vectorSum(newMousePosition, rectangleFromMousePositionOffset);
            this.setState({
                position: newRectangleTL,
            });
        };
        const handleDragEnd = () => {
            document.removeEventListener("mousemove", handleDrag);
            document.removeEventListener("mouseup", handleDragEnd);
            this.props.resetDraggableGetter();

            this.setState({
                hasDragging: false,
                position: makeVector(0, 0),
            });
        };

        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("mouseup", handleDragEnd);
        this.props.setDraggableGetter(this.entityGetter);

        this.setState({
            hasDragging: true,
            position: startRectangleTL
        });
    };

    private renderDragging = (draggingState: IDraggingState) => {
        const style = {
            top: `${vectorY(this.state.position)}px`,
            left: `${vectorX(this.state.position)}px`,
        };

        return (
            <div className={styles.DraggableContainer} style={style} ref={this.draggableContainerRef}>
                {this.props.children(this.handleStartDrag, draggingState)}
            </div>
        );
    };

    public render() {
        const {children} = this.props;
        const {hasDragging} = this.state;

        const draggingState = {
            hasDragging,
        };

        return (
            <>
                {children(this.handleStartDrag, draggingState)}
                {hasDragging && this.renderDragging(draggingState)}
            </>
        )
    }
}

export class Draggable extends Component<IProps> {
    private renderComponent = (context: IDragAndDropContextValue) => {
        return (
            <DraggableComponent {...this.props} {...context} />
        );
    };

    public render() {
        return (
            <DragAndDropConsumer>
                {this.renderComponent}
            </DragAndDropConsumer>
        );
    }
}