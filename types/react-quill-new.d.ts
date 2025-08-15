declare module 'react-quill-new' {
  // Reuse the public types of react-quill to keep our code typed
  export * from 'react-quill'
  // Default export shape compatible enough for our usage
  const ReactQuill: any
  export default ReactQuill
}
