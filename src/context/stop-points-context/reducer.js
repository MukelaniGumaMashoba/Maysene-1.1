// types
import * as types from '@/constants/types'

const stopPointReducer = (state, action) => {
  switch (action.type) {
    case types.REQUEST_START:
      return {
        ...state,
        loading: true,
        error: null,
      }
    case types.REQUEST_SUCCESS:
      return {
        ...state,
        loading: false,
      }
    case types.REQUEST_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    case types.FETCH_STOP_POINTS:
      const fetchedData = Array.isArray(action.payload) ? action.payload : []
      return {
        ...state,
        data: fetchedData,
        screenStats: state.getScreenStats ? state.getScreenStats(fetchedData) : state.screenStats,
        loading: false,
        error: null,
      }
    case types.FETCH_STOP_POINT:
      return {
        ...state,
        currentStopPoint: action.payload,
        loading: false,
      }
    case types.ADD_STOP_POINT:
      const addedData = Array.isArray(state.data)
        ? [...state.data, action.payload]
        : [action.payload]
      return {
        ...state,
        data: addedData,
        screenStats: state.getScreenStats ? state.getScreenStats(addedData) : state.screenStats,
        loading: false,
      }
    case types.UPDATE_STOP_POINT:
      const updatedData = Array.isArray(state.data)
        ? state.data.map((item) =>
            item.id === action.payload.id ? action.payload : item
          )
        : [action.payload]
      return {
        ...state,
        data: updatedData,
        screenStats: state.getScreenStats ? state.getScreenStats(updatedData) : state.screenStats,
        currentStopPoint:
          state.currentStopPoint?.id === action.payload.id
            ? action.payload
            : state.currentStopPoint,
        loading: false,
      }
    case types.DELETE_STOP_POINT:
      const deletedData = Array.isArray(state.data)
        ? state.data.filter((item) => item.id !== action.payload)
        : []
      return {
        ...state,
        data: deletedData,
        screenStats: state.getScreenStats ? state.getScreenStats(deletedData) : state.screenStats,
        currentStopPoint:
          state.currentStopPoint?.id === action.payload
            ? null
            : state.currentStopPoint,
        loading: false,
      }
    default:
      return state
  }
}

export default stopPointReducer
